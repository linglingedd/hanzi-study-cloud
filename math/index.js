HanziAuth.requireLogin().then(() => Vue.createApp({
  data() {
    return {
      range: 99,
      hasSub: false,
      problems: [],
      answers: {},
      activeIndex: null,
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
    this.activeIndex = null;
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
      this.activeIndex = null;
    },
    selectProblem(index) {
      this.activeIndex = index;
      const input = document.querySelectorAll('.answer-box')[index];
      input?.focus();
      input?.scrollIntoView({block:'nearest'});
    },
    updateAnswer(index, event) {
      const value = event.target.value.replace(/[０-９]/g, n => String.fromCharCode(n.charCodeAt(0) - 0xfee0)).replace(/[^0-9]/g, '').slice(0, 3);
      event.target.value = value;
      if (value === this.currentAnswer(index)) return;
      this.answers[index] = value;
      this.checked = false; this.allRight = false; this.feedback = '';
    },
    currentAnswer(index) {
      return String(this.answers[index] ?? '');
    },
    nextProblem(index) {
      if (index + 1 < this.problems.length) this.selectProblem(index + 1);
      else { document.querySelectorAll('.answer-box')[index]?.blur(); this.checkAnswers(); }
    }
  }
}).mount('#app'))
