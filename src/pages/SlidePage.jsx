import { useState, useEffect, useRef } from 'react';
import { SLIDE_PROMPTS } from '../data/transurfingData';

export default function SlidePage({ state, earnXP, logPractice, progressQuest, updateEnergy }) {
  const [mode, setMode] = useState('select'); // select, practice, journal, complete
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState('inhale');
  const timerRef = useRef(null);
  const breathRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathRef.current) clearInterval(breathRef.current);
    };
  }, []);

  const startPractice = (slide) => {
    setSelectedSlide(slide);
    setMode('practice');
    setTimer(slide.duration);
    setIsTimerRunning(true);
    setCurrentQuestion(0);
    setAnswers([]);

    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    breathRef.current = setInterval(() => {
      setBreathPhase(prev => prev === 'inhale' ? 'exhale' : 'inhale');
    }, 4000);
  };

  const nextQuestion = () => {
    if (currentAnswer.trim()) {
      setAnswers(prev => [...prev, currentAnswer.trim()]);
      setCurrentAnswer('');

      if (currentQuestion < selectedSlide.guideQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        setMode('journal');
      }
    }
  };

  const completeSlide = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (breathRef.current) clearInterval(breathRef.current);

    earnXP(selectedSlide.xp, 'スライド視覚化');
    updateEnergy(8);
    logPractice('slide', {
      slideId: selectedSlide.id,
      title: selectedSlide.title,
      answers,
      duration: selectedSlide.duration - timer,
    });
    progressQuest('slide');
    setMode('complete');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (mode === 'select') {
    return (
      <div className="page slide-page page-enter">
        <div className="page-header">
          <h2>🎬 スライド視覚化</h2>
          <p className="page-desc">
            ターゲットスライドを選んで、理想の現実を詳細に描きましょう。
            五感を使って、まるでそこにいるかのように感じることが大切です。
          </p>
        </div>

        <div className="slide-grid">
          {SLIDE_PROMPTS.map(slide => (
            <button
              key={slide.id}
              className="slide-card"
              onClick={() => startPractice(slide)}
            >
              <div className="slide-card-header">
                <h3>{slide.title}</h3>
                <span className="slide-xp">+{slide.xp}XP</span>
              </div>
              <p className="slide-card-prompt">{slide.prompt}</p>
              <div className="slide-card-footer">
                <span>⏱️ {slide.duration / 60}分</span>
                <span>❓ {slide.guideQuestions.length}問</span>
              </div>
            </button>
          ))}
        </div>

        {/* History */}
        {state.practices.slide.length > 0 && (
          <div className="section">
            <h3 className="section-title">📝 過去のスライド記録</h3>
            <div className="history-list">
              {state.practices.slide.slice(-5).reverse().map((entry, i) => (
                <div key={i} className="history-item">
                  <span className="history-title">{entry.title}</span>
                  <span className="history-date">
                    {new Date(entry.date).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'practice') {
    return (
      <div className="page slide-practice page-enter">
        <div className="practice-header">
          <h2>{selectedSlide.title}</h2>
          <div className={`timer ${timer <= 30 ? 'timer-warning' : ''}`}>
            {formatTime(timer)}
          </div>
        </div>

        {/* Breathing Guide */}
        <div className="breath-guide">
          <div className={`breath-circle ${breathPhase}`}>
            <span>{breathPhase === 'inhale' ? '吸う' : '吐く'}</span>
          </div>
        </div>

        {/* Guide Questions */}
        <div className="question-section">
          <div className="question-progress">
            {selectedSlide.guideQuestions.map((_, i) => (
              <div
                key={i}
                className={`question-dot ${i < currentQuestion ? 'done' : i === currentQuestion ? 'current' : ''}`}
              />
            ))}
          </div>
          <p className="question-text">
            {selectedSlide.guideQuestions[currentQuestion]}
          </p>
          <textarea
            className="answer-input"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="目を閉じて感じてから、ここに記録..."
            rows={3}
          />
          <div className="practice-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                if (breathRef.current) clearInterval(breathRef.current);
                setMode('select');
              }}
            >
              戻る
            </button>
            <button
              className="btn-primary"
              onClick={nextQuestion}
              disabled={!currentAnswer.trim()}
            >
              {currentQuestion < selectedSlide.guideQuestions.length - 1 ? '次へ' : '完了'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'journal') {
    return (
      <div className="page slide-journal page-enter">
        <div className="journal-header">
          <h2>📝 スライドの記録</h2>
          <p>あなたが描いたスライドを確認しましょう</p>
        </div>

        <div className="journal-entries">
          {selectedSlide.guideQuestions.map((q, i) => (
            <div key={i} className="journal-entry">
              <p className="journal-question">{q}</p>
              <p className="journal-answer">{answers[i]}</p>
            </div>
          ))}
        </div>

        <div className="journal-affirmation">
          <p>このスライドはあなたの選択肢の空間に既に存在しています。</p>
          <p>感情を込めて繰り返し訪れましょう。</p>
        </div>

        <button className="btn-primary btn-large" onClick={completeSlide}>
          ✨ スライドを保存する
        </button>
      </div>
    );
  }

  if (mode === 'complete') {
    return (
      <div className="page slide-complete page-enter">
        <div className="complete-animation">
          <div className="complete-icon">🌟</div>
          <h2>素晴らしいスライド実践！</h2>
          <p className="complete-xp">+{selectedSlide.xp} XP</p>
          <p className="complete-energy">+8 エネルギー</p>
          <p className="complete-message">
            あなたのターゲットスライドはより鮮明になりました。
            この感覚を一日中持ち続けましょう。
          </p>
          <button className="btn-primary" onClick={() => setMode('select')}>
            続ける
          </button>
        </div>
      </div>
    );
  }
}
