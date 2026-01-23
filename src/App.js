import React, { useState, useEffect } from "react";
import {
  Calendar,
  BookOpen,
  CheckCircle,
  XCircle,
  List,
  Home,
  Lock,
  Trash2,
  Sparkles,
  Wrench,
  TrendingUp,
  ChevronsDown,
} from "lucide-react";
import { supabase } from "./supabase";

export default function QuizApp() {
  const [mode, setMode] = useState("student");
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [quizzes, setQuizzes] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [quizDate, setQuizDate] = useState("");
  const [quizText, setQuizText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const TEACHER_USERNAME = process.env.REACT_APP_TEACHER_USERNAME;
  const TEACHER_PASSWORD = process.env.REACT_APP_TEACHER_PASSWORD;

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      const quizData = {};
      data.forEach((item) => {
        quizData[item.id] = item.questions;
      });
      setQuizzes(quizData);
    } catch (error) {
      console.log("クイズデータの読み込みエラー:", error);
    }
  };

  const handleLogin = () => {
    if (
      loginUsername === TEACHER_USERNAME &&
      loginPassword === TEACHER_PASSWORD
    ) {
      setIsTeacherLoggedIn(true);
      setLoginUsername("");
      setLoginPassword("");
      setMode("teacher");
    } else {
      alert("ユーザー名またはパスワードが間違っています");
    }
  };

  const handleLogout = () => {
    setIsTeacherLoggedIn(false);
    setMode("student");
  };

  const deleteQuiz = async (date) => {
    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", date);

      if (error) throw error;

      await loadQuizzes();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("削除エラー:", error);
      alert("削除に失敗しました");
    }
  };

  const parseQuizText = (text) => {
    const questions = [];

    // 各問題をQ番号で分割
    const questionBlocks = text.split(/(?=Q\d+\.)/);

    for (let block of questionBlocks) {
      block = block.trim();
      if (!block.startsWith("Q")) continue;

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
        if (optionA) options.push({ letter: "A", text: optionA[1].trim() });

        // B.からC.まで
        const optionB = block.match(/B\.\s*(.+?)(?=\s+C\.)/s);
        if (optionB) options.push({ letter: "B", text: optionB[1].trim() });

        // C.からD.まで
        const optionC = block.match(/C\.\s*(.+?)(?=\s+D\.)/s);
        if (optionC) options.push({ letter: "C", text: optionC[1].trim() });

        // D.から【正解】まで
        const optionD = block.match(/D\.\s*(.+?)(?=\s+【正解】)/s);
        if (optionD) options.push({ letter: "D", text: optionD[1].trim() });

        if (options.length !== 4) {
          console.warn(
            `Q${qNum}: 選択肢が4つ見つかりません (${options.length}個)`,
          );
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
        const explanationMatch = block.match(
          /【解説】[：:]\s*(.+?)(?=(?:Q\d+\.|NotebookLM|$))/s,
        );
        if (!explanationMatch) {
          console.warn(`Q${qNum}: 解説が見つかりません`);
          continue;
        }
        let explanation = explanationMatch[1].trim();

        // 解説の末尾の不要な文字を削除
        explanation = explanation
          .replace(/[,]+$/, "")
          .replace(/\s+/g, " ")
          .trim();

        // 問題を追加
        questions.push({
          question: questionText,
          options: options,
          correctAnswer: correctAnswer,
          explanation: explanation,
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
      alert("日付と問題内容を入力してください");
      return;
    }

    const parsedQuestions = parseQuizText(quizText);

    if (parsedQuestions.length === 0) {
      alert("問題を正しく解析できませんでした");
      return;
    }

    try {
      const { error } = await supabase.from("quizzes").upsert({
        id: quizDate,
        questions: parsedQuestions,
      });

      if (error) throw error;

      await loadQuizzes();
      setQuizText("");
      alert(`${parsedQuestions.length}問のクイズを保存しました！`);
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました: " + error.message);
    }
  };

  const startQuiz = () => {
    if (!selectedDate || !quizzes[selectedDate]) {
      alert("日付を選択してください");
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
      alert("選択肢を選んでください");
      return;
    }
    setShowResult(true);

    const currentQuestion = currentQuiz[currentQuestionIndex];
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore((prev) => ({
        ...prev,
        correct: prev.correct + 1,
        total: prev.total + 1,
      }));
    } else {
      setScore((prev) => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentQuiz.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // score.correctは既にcheckAnswer()でカウント済みなので、そのまま使用
      alert(
        `お疲れさまでした！\n正解数: ${score.correct} / ${currentQuiz.length}`,
      );
      setCurrentQuiz(null);
    }
  };

  const backToTop = () => {
    setCurrentQuiz(null);
    setSelectedDate("");
    setScore({ correct: 0, total: 0 });
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const switchToTeacherMode = () => {
    if (!isTeacherLoggedIn) {
      setMode("teacher-login");
    } else {
      setMode("teacher");
    }
  };

  if (mode === "teacher-login") {
    return (
      <div className="min-h-screen bg-gradient-to-br p-4 sm:p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="glass-strong rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <Lock className="mx-auto mb-3 sm:mb-4 text-cyan-300" size={40} />
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                講師 ログイン
              </h2>
              <p className="text-sm sm:text-base text-cyan-200 mt-2">
                ユーザー名とパスワードを入力してください👮
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-cyan-100 mb-2">
                  ユーザー名
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full p-3 border-2 border-white/30 rounded-xl focus:border-cyan-400 focus:outline-none"
                  placeholder="ユーザー名を入力"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-cyan-100 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full p-3 border-2 border-white/30 rounded-xl focus:border-cyan-400 focus:outline-none"
                  placeholder="パスワードを入力"
                />
              </div>

              <button
                onClick={handleLogin}
                className="w-full glass-strong hover:glass-strong/30 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                ログイン
              </button>

              <button
                onClick={() => setMode("student")}
                className="w-full glass text-cyan-100 py-3 rounded-xl font-semibold hover:bg-gray-500 transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="glass-strong rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="text-xs sm:text-sm text-cyan-200">
                問題 {currentQuestionIndex + 1} / {currentQuiz.length}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-cyan-300">
                正解数: {score.correct} / {score.total}
              </div>
            </div>

            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-4 sm:mb-6 lg:mb-8">
              Q{currentQuestionIndex + 1}. {question.question}
            </h2>

            {/*4択問題の見た目 */}
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {question.options.map((option) => (
                <button
                  key={option.letter}
                  onClick={() =>
                    !showResult && setSelectedAnswer(option.letter)
                  }
                  disabled={showResult}
                  className={`w-full p-3 sm:p-4 text-left text-sm sm:text-base rounded-xl transition-all font-medium ${
                    selectedAnswer === option.letter
                      ? showResult
                        ? option.letter === question.correctAnswer
                          ? "glass-quiz-correct"
                          : "glass-quiz-incorrect"
                        : "glass-quiz-selected"
                      : showResult && option.letter === question.correctAnswer
                        ? "glass-quiz-correct"
                        : "glass-quiz-option"
                  } ${showResult ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className="font-bold text-cyan-100 mr-3">
                    {option.letter}.
                  </span>
                  <span className="text-gray-700">{option.text}</span>
                </button>
              ))}
            </div>

            {/* 結果表示 */}
            {showResult && (
              <div
                className={`p-4 sm:p-6 rounded-xl mb-4 sm:mb-6 text-sm sm:text-base ${
                  isCorrect ? "glass-result-correct" : "glass-result-incorrect"
                }`}
              >
                <div className="flex items-center mb-3">
                  {isCorrect ? (
                    <CheckCircle className="text-green-300 mr-2" size={24} />
                  ) : (
                    <XCircle className="text-red-300 mr-2" size={24} />
                  )}
                  <span
                    className={`font-bold text-lg ${
                      isCorrect ? "text-green-100" : "text-red-100"
                    }`}
                  >
                    {isCorrect ? "正解！" : "不正解"}
                  </span>
                </div>
                <div className="text-white mb-2">
                  <span className="font-semibold text-cyan-200">正解:</span>{" "}
                  {question.correctAnswer}
                </div>
                <div className="text-gray-700">
                  <span className="font-semibold text-cyan-200">解説:</span>{" "}
                  {question.explanation}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {!showResult ? (
                <>
                  <button
                    onClick={checkAnswer}
                    className="flex-1 glass-strong hover:bg-cyan-400/40 text-white py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-sm sm:text-base hover:scale-105"
                  >
                    OK（答え合わせ）
                  </button>
                  <button
                    onClick={backToTop}
                    className="sm:px-6 glass hover:bg-gray-600 text-white py-2.5 sm:py-3 rounded-xl font-semibold transition-all text-sm sm:text-base"
                  >
                    <Home className="inline mr-1" size={16} />
                    TOPへ
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={nextQuestion}
                    className="flex-1 glass-strong hover:bg-cyan-400/40 text-white py-3 rounded-xl font-semibold transition-all hover:scale-105"
                  >
                    {currentQuestionIndex < currentQuiz.length - 1
                      ? "次の問題へ"
                      : "終了"}
                  </button>
                  <button
                    onClick={backToTop}
                    className="px-6 glass hover:bg-gray-500 text-white py-3 rounded-xl font-semibold transition-all"
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
    <div className="min-h-screen  p-4 sm:p-6 lg:p-8 relative overflow-hidden flex flex-col items-center justify-center">
      {/* 装飾的な泡 */}
      <div
        className="bubble"
        style={{
          width: "500px",
          height: "500px",
          top: "10%",
          left: "10%",
          animationDelay: "7s",
        }}
      ></div>
      <div
        className="bubble"
        style={{
          width: "700px",
          height: "700px",
          top: "50%",
          right: "10%",
          animationDelay: "10s",
        }}
      ></div>
      <div
        className="bubble"
        style={{
          width: "300px",
          height: "300px",
          bottom: "30%",
          left: "60%",
          animationDelay: "12s",
        }}
      ></div>

      <div className="max-w-4xl w-full mx-auto relative z-10 ">
        <div className="glass-strong rounded-2xl shadow-xl overflow-hidden">
          <div className="glass-strong p-6 sm:p-8 lg:p-10 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white-100 mb-3 sm:mb-4 lg:mb-6">
                  <TrendingUp className="inline mr-2" size={50} />
                  理解度チェックテスト
                </h1>
                <p className="text-sm sm:text-base text-white-100">
                  授業の復習にご活用くださいませ
                  <Sparkles className="inline mr-1 sm:mr-2" size={18} />
                </p>
              </div>
              {isTeacherLoggedIn && mode === "teacher" && (
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-indigo-200 to-blue-200 hover:glass-strong/30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ログアウト
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-10">
            <div className="flex gap-2 sm:gap-3 lg:gap-5 mb-6 sm:mb-8 lg:mb-10">
              {/* 生徒モードボタン */}
              <button
                onClick={() => setMode("student")}
                className={`flex-1   py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 lg:px-6 rounded-xl font-semibold transition-colors text-sm sm:text-base ${
                  mode === "student"
                    ? " bg-cyan-400/40 glass-shadow hover:glass-strong/30  text-white" // アクティブ時
                    : "glass text-cyan-100 hover:bg-white/30" // 非アクティブ時
                }`}
              >
                <BookOpen className="inline mr-1 sm:mr-2" size={20} />
                <span className="hidden xs:inline">生徒モード</span>
                <span className="inline xs:hidden">生徒</span>
              </button>

              {/* 講師ログインボタン */}
              <button
                onClick={switchToTeacherMode}
                className={`flex-1  py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 lg:px-6 rounded-xl font-semibold transition-colors text-sm sm:text-base ${
                  mode === "teacher"
                    ? "bg-cyan-400/40 glass-shadow hover:glass-strong/30 text-white" // アクティブ時
                    : "glass text-cyan-100 hover:bg-white/20" // 非アクティブ時
                }`}
              >
                <Lock className="inline mr-1 sm:mr-2" size={20} />
                <span className="hidden xs:inline">講師ログイン</span>
                <span className="inline xs:hidden">講師</span>
              </button>
            </div>

            {/* 生徒モードのタブ　*/}
            {mode === "student" ? (
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-6 sm:mb-8 lg:mb-12">
                  クイズに挑戦する🚀
                </h2>

                {Object.keys(quizzes).length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-cyan-200">
                    <List
                      size={36}
                      className="mx-auto mb-4 sm:mb-10 text-gray-300"
                    />
                    <p className="text-sm sm:text-base">
                      まだクイズが登録されていません
                    </p>
                    <Wrench className="inline ml-1 sm:ml-2" size={30} />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm sm:text-sm font-semibold text-cyan-100 mb-3 sm:mb-5">
                      ▼ 復習したい授業の日付を選択してください
                    </label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full glass p-2 sm:p-3 border-2 border-white/30 rounded-xl mb-4 sm:mb-7 focus:border-blue-300 focus:outline-none text-gray-800 text-sm sm:text-base"
                    >
                      <option value="">日付を選んでください</option>
                      {Object.keys(quizzes)
                        .sort()
                        .reverse()
                        .map((date) => (
                          <option key={date} value={date}>
                            {date} ({quizzes[date].length}問)
                          </option>
                        ))}
                    </select>

                    <button
                      onClick={startQuiz}
                      disabled={!selectedDate}
                      className="w-full glass hover:scale-105 text-white py-3 sm:py-4 lg:py-5 rounded-xl font-semibold hover:bg-cyan-400/40 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                      クイズを開始
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* 講師モードのタブ*/}
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-4 sm:mb-6">
                  クイズを作成
                </h2>

                <label className="block text-xs sm:text-sm font-semibold text-cyan-100 mb-2">
                  <Calendar className="inline mr-2" size={14} />
                  日付
                </label>
                <input
                  type="date"
                  value={quizDate}
                  onChange={(e) => setQuizDate(e.target.value)}
                  max={getTodayDate()}
                  className="w-full p-2 sm:p-3 border-2 border-white/30 rounded-xl mb-4 sm:mb-6 text-gray-800focus:border-cyan-400 focus:outline-none text-sm sm:text-base"
                />

                <label className="block text-xs sm:text-sm font-semibold text-cyan-100 mb-2">
                  問題内容（NotebookLMからコピーして貼り付け）
                </label>
                <textarea
                  value={quizText}
                  onChange={(e) => setQuizText(e.target.value)}
                  placeholder="【テスト】今日の理解度チェック&#10;Q1. 問題文...&#10;A. 選択肢1 B. 選択肢2...&#10;【正解】: A&#10;【解説】: 説明文..."
                  className="w-full h-48 sm:h-56 lg:h-64 p-3 sm:p-4 border-2 border-white/30 rounded-xl mb-4 sm:mb-6 focus:border-cyan-400 focus:outline-none font-mono text-xs sm:text-sm"
                />

                <button
                  onClick={saveQuiz}
                  className="w-full glass-strong hover:glass-strong/30 text-white py-3 sm:py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                >
                  クイズを保存
                </button>

                {Object.keys(quizzes).length > 0 && (
                  <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t-2 border-gray-100">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">
                      保存済みクイズ
                    </h3>
                    <div className="space-y-2">
                      {Object.keys(quizzes)
                        .sort()
                        .reverse()
                        .map((date) => (
                          <div
                            key={date}
                            className="p-4 bg-gray-50 rounded-lg flex justify-between items-center"
                          >
                            <div>
                              <span className="font-semibold text-gray-800">
                                {date}
                              </span>
                              <span className="text-gray-600 ml-3">
                                ({quizzes[date].length}問)
                              </span>
                            </div>
                            <button
                              onClick={() => setDeleteConfirm(date)}
                              className="bg-red-100 hover:bg-red-200 text-red-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                            >
                              <Trash2 size={14} />
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
          <div className="glass-strong rounded-2xl p-8 max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">削除の確認</h3>
            <p className="text-cyan-100 mb-6">
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
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-white py-3 rounded-lg font-semibold transition-colors"
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
