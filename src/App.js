import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, CheckCircle, XCircle, Plus, List, Home, Lock, Trash2 } from 'lucide-react';
import { supabase } from './supabase';

export default function QuizApp() {
  const [mode, setMode] = useState('student');
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [quizzes, setQuizzes] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [quizDate, setQuizDate] = useState('');
  const [quizText, setQuizText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const TEACHER_USERNAME = 'teacher';
  const TEACHER_PASSWORD = '1219';

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      const quizData = {};
      data.forEach((item) => {
        quizData[item.id] = item.questions;
      });
      setQuizzes(quizData);
    } catch (error) {
      console.log('クイズデータの読み込みエラー:', error);
    }
  };

  const handleLogin = () => {
    if (loginUsername === TEACHER_USERNAME && loginPassword === TEACHER_PASSWORD) {
      setIsTeacherLoggedIn(true);
      setLoginUsername('');
      setLoginPassword('');
      setMode('teacher');
    } else {
      alert('ユーザー名またはパスワードが間違っています');
    }
  };

  const handleLogout = () => {
    setIsTeacherLoggedIn(false);
    setMode('student');
  };

  const deleteQuiz = async (date) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', date);

      if (error) throw error;

      await loadQuizzes();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const parseQuizText = (text) => {
    const questions = [];

    // 各問題をQ番号で分割
    const questionBlocks = text.split(/(?=Q\d+\.)/);

    for (let block of questionBlocks) {
      block = block.trim();
      if (!block.startsWith('Q')) continue;

      try {
        // Q番号を取得
        const qNumMatch = block.match(/^Q(\d+)\./);
        if (!qNumMatch) continue;
        const qNum = qNumMatch[1];

        // 問題文を抽出（Q1. から最初のA.まで）
        const questionMatch = block.match(/^Q\d+\.\s*(.+?)(?=\s+A\.)/s);
        if (!questionMatch) {
          console.warn(`Q${qNum}: 問題文が見つかりません`);
          continue;
        }
        const questionText = questionMatch[1].trim();

        // 選択肢を抽出（A. B. C. D.）
        const options = [];

        // A.からB.まで
        const optionA = block.match(/A\.\s*(.+?)(?=\s+B\.)/s);
        if (optionA) options.push({ letter: 'A', text: optionA[1].trim() });

        // B.からC.まで
        const optionB = block.match(/B\.\s*(.+?)(?=\s+C\.)/s);
        if (optionB) options.push({ letter: 'B', text: optionB[1].trim() });

        // C.からD.まで
        const optionC = block.match(/C\.\s*(.+?)(?=\s+D\.)/s);
        if (optionC) options.push({ letter: 'C', text: optionC[1].trim() });

        // D.から【正解】まで
        const optionD = block.match(/D\.\s*(.+?)(?=\s+【正解】)/s);
        if (optionD) options.push({ letter: 'D', text: optionD[1].trim() });

        if (options.length !== 4) {
          console.warn(`Q${qNum}: 選択肢が4つ見つかりません (${options.length}個)`);
          continue;
        }

        // 正解を抽出
        const answerMatch = block.match(/【正解】[：:]\s*([A-D])/);
        if (!answerMatch) {
          console.warn(`Q${qNum}: 正解が見つかりません`);
          continue;
        }
        const correctAnswer = answerMatch[1];

        // 解説を抽出（【解説】から次のQ番号、NotebookLM、または文末まで）
        const explanationMatch = block.match(/【解説】[：:]\s*(.+?)(?=(?:Q\d+\.|NotebookLM|$))/s);
        if (!explanationMatch) {
          console.warn(`Q${qNum}: 解説が見つかりません`);
          continue;
        }
        let explanation = explanationMatch[1].trim();

        // 解説の末尾の不要な文字を削除
        explanation = explanation
          .replace(/[,，。]+$/, '')
          .replace(/\s+/g, ' ')
          .trim();

        // 問題を追加
        questions.push({
          question: questionText,
          options: options,
          correctAnswer: correctAnswer,
          explanation: explanation
        });

        console.log(`✓ Q${qNum} 解析成功`);

      } catch (error) {
        console.error(`Q番号不明: 解析エラー`, error);
      }
    }

    return questions;
  };

  const saveQuiz = async () => {
    if (!quizDate || !quizText) {
      alert('日付と問題内容を入力してください');
      return;
    }

    const parsedQuestions = parseQuizText(quizText);

    if (parsedQuestions.length === 0) {
      alert('問題を正しく解析できませんでした');
      return;
    }

    try {
      const { error } = await supabase
        .from('quizzes')
        .upsert({
          id: quizDate,
          questions: parsedQuestions
        });

      if (error) throw error;

      await loadQuizzes();
      setQuizText('');
      alert(`${parsedQuestions.length}問のクイズを保存しました！`);
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました: ' + error.message);
    }
  };

  const startQuiz = () => {
    if (!selectedDate || !quizzes[selectedDate]) {
      alert('日付を選択してください');
      return;
    }
    setCurrentQuiz(quizzes[selectedDate]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore({ correct: 0, total: 0 });
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) {
      alert('選択肢を選んでください');
      return;
    }
    setShowResult(true);

    const currentQuestion = currentQuiz[currentQuestionIndex];
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentQuiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      alert(`お疲れさまでした！\n正解数: ${score.correct + (selectedAnswer === currentQuiz[currentQuestionIndex].correctAnswer ? 1 : 0)} / ${currentQuiz.length}`);
      setCurrentQuiz(null);
    }
  };

  const backToTop = () => {
    setCurrentQuiz(null);
    setSelectedDate('');
    setScore({ correct: 0, total: 0 });
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const switchToTeacherMode = () => {
    if (!isTeacherLoggedIn) {
      setMode('teacher-login');
    } else {
      setMode('teacher');
    }
  };

  if (mode === 'teacher-login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <Lock className="mx-auto mb-4 text-indigo-600" size={48} />
              <h2 className="text-2xl font-bold text-gray-800">先生モード ログイン</h2>
              <p className="text-gray-500 mt-2">ユーザー名とパスワードを入力してください👮</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ユーザー名</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  placeholder="teacher"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">パスワード</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  placeholder="パスワードを入力"
                />
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                ログイン
              </button>

              <button
                onClick={() => setMode('student')}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentQuiz) {
    const question = currentQuiz[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-500">
                問題 {currentQuestionIndex + 1} / {currentQuiz.length}
              </div>
              <div className="text-sm font-semibold text-indigo-600">
                正解数: {score.correct} / {score.total}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-8">
              Q{currentQuestionIndex + 1}. {question.question}
            </h2>

            <div className="space-y-4 mb-8">
              {question.options.map((option) => (
                <button
                  key={option.letter}
                  onClick={() => !showResult && setSelectedAnswer(option.letter)}
                  disabled={showResult}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${selectedAnswer === option.letter
                    ? showResult
                      ? option.letter === question.correctAnswer
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-indigo-500 bg-indigo-50'
                    : showResult && option.letter === question.correctAnswer
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                    } ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="font-semibold text-indigo-600 mr-3">{option.letter}.</span>
                  {option.text}
                </button>
              ))}
            </div>

            {showResult && (
              <div className={`p-6 rounded-xl mb-6 ${isCorrect ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className="flex items-center mb-3">
                  {isCorrect ? (
                    <CheckCircle className="text-green-600 mr-2" size={24} />
                  ) : (
                    <XCircle className="text-red-600 mr-2" size={24} />
                  )}
                  <span className={`font-bold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect ? '正解！' : '不正解'}
                  </span>
                </div>
                <div className="text-gray-700 mb-2">
                  <span className="font-semibold">正解:</span> {question.correctAnswer}
                </div>
                <div className="text-gray-700">
                  <span className="font-semibold">解説:</span> {question.explanation}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              {!showResult ? (
                <>
                  <button
                    onClick={checkAnswer}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    OK（答え合わせ）
                  </button>
                  <button
                    onClick={backToTop}
                    className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <Home className="inline mr-1" size={18} />
                    TOPへ
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={nextQuestion}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    {currentQuestionIndex < currentQuiz.length - 1 ? '次の問題へ' : '終了'}
                  </button>
                  <button
                    onClick={backToTop}
                    className="px-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <Home className="inline mr-1" size={18} />
                    TOPへ
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-400 p-10 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white-100 mb-6">理解度チェックテストアプリ</h1>
                <p className="text-white-100">授業の復習を簡単に</p>
              </div>
              {isTeacherLoggedIn && mode === 'teacher' && (
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-indigo-200 to-blue-200 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ログアウト
                </button>
              )}
            </div>
          </div>

          <div className="p-10">
            <div className="flex gap-5 mb-10">
              <button
                onClick={() => setMode('student')}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-colors ${mode === 'student'
                  ? 'bg-blue-400 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <BookOpen className="inline mr-2" size={30} />
                生徒モード
              </button>
              <button
                onClick={switchToTeacherMode}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-colors ${mode === 'teacher'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <Plus className="inline mr-2" size={30} />
                先生モード
              </button>
            </div>

            {mode === 'student' ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-12">クイズに挑戦する🐱🐾</h2>

                {Object.keys(quizzes).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <List size={48} className="mx-auto mb-10 text-gray-300" />
                    <p>まだクイズが登録されていません👷✖</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-5">
                      ▼復習したい授業の日付を選択してください
                    </label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl mb-7 focus:border-blue-300 focus:outline-none"
                    >
                      <option value="">日付を選んでください</option>
                      {Object.keys(quizzes).sort().reverse().map(date => (
                        <option key={date} value={date}>
                          {date} ({quizzes[date].length}問)
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={startQuiz}
                      disabled={!selectedDate}
                      className="w-full bg-orange-300 text-white py-5 rounded-xl font-semibold hover:bg-orange-400 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      クイズを開始
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">クイズを作成</h2>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="inline mr-2" size={16} />
                  日付
                </label>
                <input
                  type="date"
                  value={quizDate}
                  onChange={(e) => setQuizDate(e.target.value)}
                  max={getTodayDate()}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl mb-6 focus:border-indigo-500 focus:outline-none"
                />

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  問題内容（NotebookLMからコピーして貼り付け）
                </label>
                <textarea
                  value={quizText}
                  onChange={(e) => setQuizText(e.target.value)}
                  placeholder="【テスト】今日の理解度チェック&#10;Q1. 問題文...&#10;A. 選択肢1 B. 選択肢2...&#10;【正解】: A&#10;【解説】: 説明文..."
                  className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl mb-6 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                />

                <button
                  onClick={saveQuiz}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  クイズを保存
                </button>

                {Object.keys(quizzes).length > 0 && (
                  <div className="mt-8 pt-8 border-t-2 border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">保存済みクイズ</h3>
                    <div className="space-y-2">
                      {Object.keys(quizzes).sort().reverse().map(date => (
                        <div key={date} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-gray-800">{date}</span>
                            <span className="text-gray-500 ml-3">({quizzes[date].length}問)</span>
                          </div>
                          <button
                            onClick={() => setDeleteConfirm(date)}
                            className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">削除の確認</h3>
            <p className="text-gray-600 mb-6">
              {deleteConfirm}のクイズを削除してもよろしいですか？
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => deleteQuiz(deleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                削除する
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}