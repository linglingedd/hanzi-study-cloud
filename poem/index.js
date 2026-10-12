// index.js

const { createApp } = Vue;

const app = {
    data() {
        return {
            grades: ['一年级上', '一年级下', '二年级上', '二年级下', '三年级上', '三年级下', '四年级上', '四年级下', '五年级上', '五年级下', '六年级上', '六年级下'],
            currGrade: getStorage('poem_currGrade') || 0,
            poemData: window.poemData,
            currentPoetryList: [],
            selectedPoetry: null,
            isPlaying: false,
            audioPlayer: null,
            currPoemInd: -1,
            showList: false,
            showAuthor: getStorage('poem_showAuthor') || false,
            repeatPlay: getStorage('poem_repeatPlay') || false,
            keyword: '',
            rangVal: 0,
            // 主题相关
            currentTheme: 'theme-default', // 默认主题
            themes: [
                { key: 'theme-default', color: '#fff5e1' }, // 淡黄
                { key: 'theme-green', color: '#e8f5e9' },   // 淡绿
                { key: 'theme-blue', color: '#e3f2fd' },    // 淡蓝
                { key: 'theme-purple', color: '#f3e5f5' }   // 淡紫
            ],
            timer: null,
        };
    },
    created() {
        let ind = getStorage('poem_currPoemInd')
        this.currPoemInd = ind || ind === 0 ? ind : -1
    },
    mounted() {
        this.currentPoetryList = this.poemData[this.currGrade] || [];
        this.audioPlayer = document.getElementById('audio-item') // new Audio();
        this.audioPlayer.onended = () => {
            if (this.repeatPlay) {
                this.nextPoetry()
            } else {
                this.isPlaying = false;
            }
        };
        this.audioPlayer.onerror = (e) => {
            console.error("Error loading audio:", e);
        };
        if (this.currPoemInd != -1) {
            this.selectPoetry(this.currentPoetryList[this.currPoemInd], true)
        }

        const savedTheme = localStorage.getItem('poetryAppTheme');
        if (savedTheme && this.themes.some(t => t.key === savedTheme)) {
            this.currentTheme = savedTheme;
        }
    },
    methods: {
        getFilterPoems(poems) {
            return poems.filter(poem => poem.title.includes(this.keyword) || poem.author.includes(this.keyword))
        },
        scroll() {
            document.querySelector('.poetry-list li.active').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        },
        saveLocal() {
            setStorage('poem_currGrade', this.currGrade);
            setStorage('poem_currPoemInd', this.currPoemInd);
            setStorage('poem_showAuthor', this.showAuthor);
            setStorage('poem_repeatPlay', this.repeatPlay);
        },
        selectGrade() {
            this.currentPoetryList = this.poemData[this.currGrade] || [];
            this.selectedPoetry = null;
            this.currPoemInd = -1;
            this.stopAudio();
            this.saveLocal()
        },
        selectPoetry(poetry, isInit, gradeInd) {
            if (!poetry) return;
            if (gradeInd !== undefined) {
                this.showList = false;
                this.currGrade = gradeInd;
                this.currentPoetryList = this.poemData[this.currGrade]
            }
            poetry.audio = `./audio/${poetry.title}.mp3`;
            this.selectedPoetry = poetry;
            if (!isInit) {
                this.currPoemInd = this.currentPoetryList.findIndex(p => p.id === poetry.id);
                this.stopAudio();
                this.playAudio(this.selectedPoetry.audio)
                this.saveLocal()
            }
            setTimeout(() => this.scroll(), 100)
        },
        playAudio(audioUrl) {
            if (!audioUrl) return;
            // 如果当前正在播放且URL相同，则不重新加载
            if (this.audioPlayer.src === audioUrl && !this.audioPlayer.paused) {
                return;
            }
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                // 如果URL不同或播放器已暂停，则加载并播放
                if (this.getFileName(this.audioPlayer.src) !== this.getFileName(audioUrl)) {
                    this.audioPlayer.currentTime = 0;
                    this.audioPlayer.src = audioUrl;
                }
                setTimeout(() => {
                    this.audioPlayer.play().then(() => {
                        this.isPlaying = true;
                    }).catch(error => {
                        console.error("音频播放失败:", error);
                        this.isPlaying = false;
                    });
                }, 100)
            }, 200)
        },
        stopAudio() {
            if (this.audioPlayer) {
                this.audioPlayer.pause();
                // this.audioPlayer.currentTime = 0;
                this.isPlaying = false;
            }
        },
        toggleAudio() {
            if (!this.selectedPoetry || !this.selectedPoetry.audio) return;
            if (this.audioPlayer.paused) {
                this.playAudio(this.selectedPoetry.audio);
            } else {
                this.stopAudio();
            }
        },
        prevPoetry() {
            if (this.currPoemInd > 0) {
                this.currPoemInd--;
                this.selectPoetry(this.currentPoetryList[this.currPoemInd]);
            } else if (this.repeatPlay) {
                this.currPoemInd = this.currentPoetryList.length - 1;
                this.selectPoetry(this.currentPoetryList[this.currPoemInd]);
            }
        },
        nextPoetry() {
            if (this.currPoemInd < this.currentPoetryList.length - 1) {
                this.currPoemInd++;
                this.selectPoetry(this.currentPoetryList[this.currPoemInd]);
            } else if (this.repeatPlay) {
                this.currPoemInd = 0;
                this.selectPoetry(this.currentPoetryList[this.currPoemInd]);
            }
        },
        // 用于分割拼音字符串
        getPinyinChars(pinyinLine) {
            return pinyinLine.split(' ');
        },
        // 切换主题
        changeTheme(themeKey) {
            this.currentTheme = themeKey;
            // 将当前主题保存到 localStorage
            if (HanziAuth.canWrite()) { localStorage.setItem('poetryAppTheme', themeKey); HanziAuth.queueSync(); }
            if (window.HanziAuth) window.HanziAuth.queueSync();
        },
        getFileName(val) {
            return decodeURIComponent(val.substring(val.lastIndexOf('/') + 1)).toLowerCase();

        }
    },
    computed: {
        canPrev() {
            return this.currPoemInd > 0;
        },
        canNext() {
            return this.currPoemInd < this.currentPoetryList.length - 1;
        }
    },
    watch: {
        selectedPoetry(newPoetry) {
            if (newPoetry && newPoetry.audio) {
                this.stopAudio();
                this.playAudio(newPoetry.audio);
            } else {
                this.stopAudio();
            }
        }
    }
};

HanziAuth.requireLogin().then(() => createApp(app).mount('#app'));
