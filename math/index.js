HanziAuth.requireLogin().then(() => Vue.createApp({
  data() {
    return {
      range: 99,
      hasSub: false,
      problems: [],
      answers: {},
      activeIndex: null,
      currItem: null,
      checked: false,
      allRight: false,
    }
  },
  mounted() {
    this.range = getStorage('math-range') || 99
    this.hasSub = getStorage('math-sub') || false;
    const saved = getStorage('math-state');
    if (saved && Array.isArray(saved.problems) && saved.problems.length === 18) {
      this.problems = saved.problems; this.answers = saved.answers || {};
      this.checked = !!saved.checked; this.allRight = !!saved.allRight;
    } else this.generateProblems();
  },
  watch: {
    problems: { deep: true, handler() { this.saveQuiz(); } },
    answers: { deep: true, handler() { this.saveQuiz(); } },
    checked() { this.saveQuiz(); }
  },
  methods: {
    saveQuiz() {
      if (this.problems.length !== 18) return;
      setStorage('math-state', { problems: this.problems, answers: this.answers, checked: this.checked, allRight: this.allRight });
    },
    checkAnswers() {
      let len = Object.values(this.answers).filter(Boolean).length
      if (len !== this.problems.length) {
        playAudio('tip-check') 
        return setTimeout(() => alert('请先回答完所有题目再检查哦'), 100)
      }
      let correctLen = this.problems.filter(item => item.correct).length;
      if (correctLen === this.problems.length) {
        playAudio('tip-correct')
        this.allRight = true
      } else {
        playAudio('tip-wrong') 
        this.allRight = false
      }
      this.checked = true;
    },
    isCorrect(index) {
      const problem = this.problems[index];
      const answer = parseInt(this.answers[index]) || 0;
      return problem.operator === '+' ? 
        problem.num1 + problem.num2 === answer :
        problem.num1 - problem.num2 === answer;
    },
    generateProblems() {
      let len = Object.values(this.answers).filter(Boolean).length
      let correctLen = this.problems.filter(item => item.correct).length;
      console.log(len, correctLen);
      if (correctLen != this.problems.length && len > 0) {
        playAudio('tip-gen') 
        return setTimeout(() => alert('请回答完当前所有题目再生成哦'), 100)
      }
      this.allRight = false
      setStorage('math-range', Number(this.range));
      setStorage('math-sub', this.hasSub);
      this.problems = [];
      this.checked = false;
      const problems = new Set();
      while(problems.size < 18) {
        const num1 = Math.floor(Math.random() * this.range) + 1;
        const num2 = Math.floor(Math.random() * (this.hasSub ? num1 : this.range)) + 1;
        const operator = this.hasSub && Math.random() > 0.5 ? '-' : '+';
        
        if (operator === '-' && num1 < num2) continue;
        
        const key = `${Math.min(num1, num2)}${operator}${Math.max(num1, num2)}`;
        if (!problems.has(key)) {
          problems.add(key);
          this.problems.push({
            num1: operator === '+' ? num1 : num1,
            operator,
            num2: operator === '+' ? num2 : num2
          });
        }
      }
      this.answers = {};
      this.activeIndex = null;
    },
    selectProblem(index) {
      this.activeIndex = index;
      this.currItem = this.problems[index];
    },
    inputNumber(n) {
      if (this.activeIndex !== null) {
        const current = this.currentAnswer(this.activeIndex) || '';
        const newAnswer = current + n.toString();
        if (newAnswer.length <= 3) {
          this.answers[this.activeIndex] = newAnswer;
          this.currItem.correct = this.isCorrect(this.activeIndex);
          // this.$set(this.answers, this.activeIndex, newAnswer);
        }
      }
    },
    deleteNumber() {
      if (this.activeIndex !== null) {
        const current = this.currentAnswer(this.activeIndex);
        if (current) {
          this.answers[this.activeIndex] = current.slice(0, -1);
          this.currItem.correct = this.isCorrect(this.activeIndex);
          // this.$set(this.answers, this.activeIndex, current.slice(0, -1));
        }
      }
    },
    currentAnswer(index) {
      return this.answers[index] || '';
    },
    goHanzi() {
      window.location.href = '../index.html'
    }
  }
}).mount('#app'))
