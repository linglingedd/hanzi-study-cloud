// window.bgAudio = new Audio('audio/bg.mp3')

let TEST_INTERVAL = 6 // 测验间隔
let listTemp = []
window.dataList.forEach((item, ind) => {
  listTemp.push(item)
  if (ind > 2 && ind % TEST_INTERVAL === 0) listTemp.push({
    w: '测验',
    isTest: true
  })
})

HanziAuth.requireLogin().then(() => Vue.createApp({
  data() {
    return {
      flag: 1,
      bgPlay: false,
      notStart: true,
      list: listTemp,
      message: 'Hello Vue!',
      lockInd: 0,
      currItem: null,
      currInd: 0,
      randomList: [],
      hanziShow: true,
      cardShow: false,
      gameShow: false,
      gameStep: [],
      gameType: 'listen', // listen fill stroke draw
      gameStatus: null, // init playing end
      strokeStatus: null, // [0, 1]
      drawStatus: null, // 1 - 100
      drawImg: null,
      audioBg: null,
      theme: 'default', // default green
      isClickRead: false, // 是否点读模式,
      currTest: false,
      currTestPractice: false,
      drawType: 'slide-up',
      drawTypeList: ['slide-up', 'slide-down', 'slide-left', 'slide-right', 'fade', 'scale', 'circle'],
      drawColor: '#fff',
      readingStatus: '点击汉字或“听发音”即可朗读',
      readingError: false,
      pendingTimers: [],
      writers: [],
    }
  },
  created() {
    this.lockInd = Math.max(0, Math.min(this.list.length, Number(getStorage('lockInd')) || 0))
    this.bgPlay = getStorage('bgPlay') === true
    this.theme = getStorage('theme') || 'default'
    // if (!this.bgPlay) this.notStart = false
  },
  mounted() {
    this.audioBg = document.getElementById('audioBg')
    this.audioBg.volume = 0.3
    loadScripts().catch(() => {})
    window.addEventListener('reading-status', event => { this.readingStatus = event.detail.text; this.readingError = event.detail.error; })
    window.addEventListener('study-home', () => this.goHome())
    window.addEventListener('popstate', () => {
      this.clearActivity()
      const view = location.hash.slice(1)
      this.notStart = !['hanzi', 'card', 'game'].includes(view)
      this.gameShow = view === 'game' && !!this.currItem
      this.cardShow = view === 'card' && !!this.currItem
      this.hanziShow = !this.gameShow && !this.cardShow
      if (this.gameShow) { this.gameShow = false; this.cardShow = true; }
    })
    // A direct link to a study list still has an explicit route back to the home menu.
    if (location.hash === '#hanzi') this.notStart = false
    document.addEventListener("visibilitychange", () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        if (this.bgPlay && this.hanziShow) this.playBg()
      } else {
        if (this.bgPlay && this.hanziShow && !this.notStart && !this.isClickRead) this.playBg(true)
      }
    });
  },
  methods: {
    speakText(text, times) { this.playBg(); return speakText(text, times); },
    stopReading() { HanziSpeech.stop(); },
    later(fn, delay) { this.pendingTimers.push(setTimeout(fn, delay)); },
    clearActivity() {
      this.pendingTimers.forEach(clearTimeout); this.pendingTimers = [];
      this.writers.forEach(writer => { writer.pauseAnimation(); writer.cancelQuiz(); }); this.writers = [];
      HanziSpeech.stop(); this.playBg();
    },
    route(view) { if (location.hash !== '#' + view) history.pushState(null, '', '#' + view); },
    goHome() {
      this.clearActivity(); this.notStart = true; this.hanziShow = true; this.cardShow = false; this.gameShow = false;
      this.route('home'); HanziAuth.queueSync(); window.scrollTo({ top: 0 });
    },
    changeTheme() {
      this.theme = this.theme === 'default' ? 'green' : 'default'
      setStorage('theme', this.theme)
    },
    toggleBg() {
      this.bgPlay = !this.bgPlay
      setStorage('bgPlay', this.bgPlay)
      if (this.bgPlay) {
        this.playBg(true)
      } else {
        this.playBg()
      }
    },
    toggleCr() {
      this.isClickRead = !this.isClickRead
      HanziSpeech.stop()
      if (this.isClickRead) {
        this.playBg()
      } else if (this.bgPlay) {
        this.playBg(true)
      }
      dnotify(`已切换为${ this.isClickRead ? '点读模式，可听读汉字或直接测验' : '学习模式' }`)
    },
    playBg(isPlay) {
      if (isPlay === true) {
        this.audioBg.play().catch(() => { dnotify('音乐未能播放，请再次点击音乐按钮。'); this.bgPlay = false; setStorage('bgPlay', false); })
      } else {
        this.audioBg.pause()
      }
    },
    goTop() {
      // document.getElementById('hanzi-list').scrollTo({ top: 0, behavior: 'smooth'});
      document.querySelector(`#hanzi-list > .hanzi-item:nth-of-type(${Math.min(this.lockInd + 1, this.list.length)})`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    },
    startApp() {
      this.notStart = false
      this.route('hanzi')
      if (this.bgPlay && !this.isClickRead) this.playBg(true)
      this.$nextTick(() => this.goTop())
    },
    goBack(step) {
      this.clearActivity()
      playAudio('click')
      this.hanziShow = this.currTest || step == 1;
      this.cardShow = !this.currTest && step == 2;
      this.gameShow = false;
      this.gameStatus = null
      this.strokeStatus = null
      this.drawStatus = null
      this.route(this.hanziShow ? 'hanzi' : 'card')
      if (this.hanziShow && this.bgPlay && !this.isClickRead) this.playBg(true)
    },
    hanziClick(item, ind) {
      if (this.isClickRead && !item.isTest) { this.speakText(item.w); return; }
      if (!this.isClickRead && this.lockInd < ind) { playAudio('lock'); return dnotify('先完成当前关卡，再学习后面的汉字；也可以开启点读听发音或练习测验。', 5000); }
      this.clearActivity()
      this.audioBg.pause()
      this.currInd = ind;
      this.currTest = !!item.isTest;
      this.currTestPractice = !!item.isTest && this.isClickRead;
      if (item.isTest) {
        let temp = this.list
          .filter((x, i) => i >= ind - (TEST_INTERVAL) && i < ind)
          .sort(() => Math.random() - 0.5) // .slice(0, 3)
        this.randomList = temp.map(item => ({ ...item }));
        this.currItem = temp[Math.floor(Math.random() * temp.length)]
        this.gameStep = [1];
        this.hanziShow = false;
        this.cardShow = true;
        this.goGame('listen')
      } else {
        // 随机抽取ind周围前后20个之内的3个汉字
        this.currItem = item;
        let temp = window.dataList
          .filter((x, i) => i >= ind - 20 && i <= ind + 20 && x.w != item.w)
          .sort(() => Math.random() - 0.5).slice(0, 3)
        // temp随机一个位置插入currItem
        temp.splice(Math.floor(Math.random() * temp.length), 0, item)
        this.randomList = temp.map(item => ({ ...item }));
        this.gameStep = [];
        this.hanziShow = false;
        this.cardShow = true;
        this.route('card')
        this.readItem(item)
      }
    },
    readItem(item, onlyOne) {
      item = item || this.currItem;
      if (item) this.speakText(onlyOne ? item.w : (item.w + '，' + item.p + '的' + item.w))
    },
    goGame(type) {
      if (this.lockInd == this.currInd && ((type === 'listen' && this.gameStep.length < 1)
        || (type === 'draw' && this.gameStep.length < 2))) { playAudio('gamelock'); return dnotify('请按顺序先完成前面的练习，再进入这一项。'); }
      this.clearActivity()
      this.gameStatus = null
      this.cardShow = false;
      this.gameType = type;
      this.gameShow = true
      this.route('game')
      this.randomList.forEach(x => x.status = '')
      this.later(() => {
        const isPlayTip = this.lockInd < 11
        if (isPlayTip) playAudio(`game-${type}`) // 10关以内播放提示
        if (type === 'stroke') {
          this.strokeStatus = null
          listHanzi(document.getElementById('stroke-list'), this.currItem.w, 46)
          this.writers.push(aniHanzi(document.getElementById('stroke-ani'), this.currItem.w, Math.min(160, (innerWidth - 72) / 2)))
          this.writers.push(writeHanzi(document.getElementById('stroke-write'), this.currItem.w, Math.min(180, (innerWidth - 72) / 2), (_, finish, total) => {
            this.strokeStatus = [finish, total]
            if (finish === total) {
              playAudio('correct')
              playAudio('correct-stroke')
              if (!this.gameStep.includes(1)) this.gameStep.push(1)
            }
          }))
        }
        if (type === 'listen') {
          this.later(() => this.speakText(this.currItem.w, 3), isPlayTip ? 2200 : 500)
        }
        if (type === 'draw') {
          this.later(() => this.speakText(this.currItem.w, 3), isPlayTip ? 2500 : 500)
          let len = 66
          // 随机一个
          this.drawImg = `./img/draw/draw${Math.floor(Math.random() * len + 1)}.webp`
          this.drawStatus = 0
          this.drawType = this.drawTypeList[Math.floor(Math.random() * this.drawTypeList.length)]
          this.drawColor = getRandomColor()
        }
      }, 500)
    },
    listenClick(item) {
      if (this.gameStatus == 'correct') return
      this.randomList.forEach(x => x.status = '')
      if (item.w == this.currItem.w) {
        console.log(6666666666);
        playAudio('correct')
        playAudio('correct-listen')
        item.status = 'correct'
        this.gameStatus = 'correct'
        if (!this.gameStep.includes(2)) this.gameStep.push(2)
        if (this.currTest) {
          if (!this.currTestPractice && this.currInd == this.lockInd) this.addLockInd()
          this.later(() => this.goBack(1), 1200)
        }
      } else {
        playAudio('wrong')
        item.status = 'wrong'
        this.gameStatus = 'wrong'
      }
    },
    drawClick(item) {
      this.randomList.forEach(x => x.status = '')
      console.log('drawClick..........');
      if (this.drawStatus === 100) {
        return
      }
      if (item.w == this.currItem.w) {
        playAudio('correct')
        item.status = 'correct'
        let temp = this.drawStatus + 10
        this.drawStatus = temp > 100 ? 100 : temp
        if (this.drawStatus === 100) {
          playAudio('correct-stroke')
          this.gameStatus = 'correct'
          if (!this.gameStep.includes(3)) this.gameStep.push(3)
          if (this.currInd == this.lockInd) {
            this.addLockInd()
            this.later(() => this.goBack(1), 1000)
          }
        }

      } else {
        playAudio('wrong1')
        item.status = 'wrong'
        let temp = this.drawStatus - 10
        this.drawStatus = temp < 0 ? 0 : temp
      }
    },
    addLockInd() {
      this.lockInd = Math.min(this.list.length, this.lockInd + 1)
      setStorage('lockInd', this.lockInd)
    },
    flagClick() {
      this.flag++
      if (this.flag == 10) {
        let ind = window.prompt('请输入解锁关卡')
        if (ind && ind.trim() && !isNaN(ind)) {
          setStorage('lockInd', parseInt(ind))
          location.reload()
        }
      }
    },
    goMath() {
      window.location.href = './math/index.html'
    },
    goPoem() {
      window.location.href = './poem/index.html'
    },
  },
}).mount('#app'))
