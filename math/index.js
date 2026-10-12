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
      feedback: '',
    }
  },
  mounted() {
    this.range = Number(getStorage('math-range')) === 10 ? 10 : 99
    this.hasSub = getStorage('math-sub') || false;
    const saved = getStorage('math-state');
    if (saved && Array.isArray(saved.problems) && saved.problems.length === 18) {
      this.problems = saved.problems; this.answers = saved.answers || {};
      this.checked = !!saved.checked; this.allRight = !!saved.allRight;
    } else this.generateProblems();
    this.activeIndex = 0; this.currItem = this.problems[0];
    document.addEventListener('keydown', event => {
      if (event.target.closest('input,select,button,dialog') || this.$refs.resetDialog.open) return;
      if (/^[0-9]$/.test(event.key)) { event.preventDefault(); this.inputNumber(event.key); }
      if (event.key === 'Backspace') { event.preventDefault(); this.deleteNumber(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); this.nextProblem(); }
    });
  },
  computed: { answeredCount() { return this.problems.filter((_, i) => this.currentAnswer(i) !== '').length; } },
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
      let len = this.answeredCount
      if (len !== this.problems.length) {
        playAudio('tip-check') 
        this.feedback = `还有 ${this.problems.length - len} 题未填写，先完成再检查哦。`;
        return this.selectProblem(this.problems.findIndex((_, i) => this.currentAnswer(i) === ''));
      }
      let correctLen = this.problems.filter((_, i) => this.isCorrect(i)).length;
      if (correctLen === this.problems.length) {
        playAudio('tip-correct')
        this.allRight = true
      } else {
        playAudio('tip-wrong') 
        this.allRight = false
      }
      this.checked = true;
      this.feedback = correctLen === this.problems.length ? '全部答对，真棒！可以换一组题啦。' : `答对 ${correctLen} / ${this.problems.length} 题，修改标红的答案后再检查。`;
      this.saveQuiz();
    },
    isCorrect(index) {
      const problem = this.problems[index];
      if (this.currentAnswer(index) === '') return false;
      const answer = Number(this.answers[index]);
      return problem.operator === '+' ? 
        problem.num1 + problem.num2 === answer :
        problem.num1 - problem.num2 === answer;
    },
    requestProblems() {
      if (this.answeredCount && !this.allRight) return this.$refs.resetDialog.showModal();
      this.generateProblems();
    },
    generateProblems() {
      this.feedback = '';
      this.allRight = false
      setStorage('math-range', Number(this.range));
      setStorage('math-sub', this.hasSub);
      this.problems = [];
      this.checked = false;
      const candidates = [], limit = Number(this.range) === 10 ? 10 : 100;
      for (let a = 1; a <= Math.min(99, limit); a++) for (let b = 1; b <= a; b++) {
        if (a + b <= limit) candidates.push({num1:a, num2:b, operator:'+'});
        if (this.hasSub) candidates.push({num1:a, num2:b, operator:'-'});
      }
      for (let i = candidates.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
      this.problems = candidates.slice(0, 18);
      this.answers = {};
      this.activeIndex = 0; this.currItem = this.problems[0];
    },
    selectProblem(index) {
      this.activeIndex = index;
      this.currItem = this.problems[index];
      this.$nextTick(() => document.querySelectorAll('.problem')[index]?.scrollIntoView({block:'nearest', behavior:'smooth'}));
    },
    inputNumber(n) {
      if (this.activeIndex !== null) {
        const current = this.currentAnswer(this.activeIndex) || '';
        const newAnswer = current + n.toString();
        if (newAnswer.length <= 3) {
          this.answers[this.activeIndex] = newAnswer;
          this.checked = false; this.allRight = false; this.feedback = '';
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
          this.checked = false; this.allRight = false; this.feedback = '';
          this.currItem.correct = this.isCorrect(this.activeIndex);
          // this.$set(this.answers, this.activeIndex, current.slice(0, -1));
        }
      }
    },
    currentAnswer(index) {
      return this.answers[index] || '';
    },
    nextProblem() { this.selectProblem((this.activeIndex + 1) % this.problems.length); }
  }
}).mount('#app'))
