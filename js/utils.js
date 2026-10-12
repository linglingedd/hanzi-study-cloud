// # 浏览器-storage封装
function getStorage(key) {
  let result = localStorage.getItem(key)
  try {
    return JSON.parse(result)
  } catch {
    return result
  }
}
function setStorage(key, val) {
  if (window.HanziAuth && !window.HanziAuth.canWrite()) return
  if (!val && val !== 0 && val !== false) {
    localStorage.removeItem(key)
    if (window.HanziAuth) window.HanziAuth.queueSync()
    return
  }
  localStorage.setItem(key, JSON.stringify(val))
  if (window.HanziAuth) window.HanziAuth.queueSync()
}
function delStorage(key) {
  if (window.HanziAuth && !window.HanziAuth.canWrite()) return
  localStorage.removeItem(key)
  if (window.HanziAuth) window.HanziAuth.queueSync()
}

function playAudio(type) {
  return new Audio(new URL(`audio/${type}.mp3`, HanziAuth.root).href).play().catch(() => false)
}

function myAlert(msg, timeout) {
  dnotify(msg, 4500)
}

const loadedScripts = new Map()
function loadScripts(file = 'js/lib/dataWriter.js') {
  if (!loadedScripts.has(file)) loadedScripts.set(file, new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = new URL(file, HanziAuth.root).href
    script.onload = resolve
    script.onerror = () => { loadedScripts.delete(file); script.remove(); reject(Error('笔画加载失败')); }
    document.body.appendChild(script)
  }))
  return loadedScripts.get(file)
}

 function speakText(text, times, rate, pitch) {
    if (window.HanziSpeech) return HanziSpeech.speak(text, times, rate)
    if (window.speechSynthesis) {
        times = times || 1;
        rate = rate || 0.7;
        pitch = pitch || 1;
        const utterance = new SpeechSynthesisUtterance(new Array(times).fill(text).join(", 。 "));
        utterance.lang = "zh-CN";
        utterance.rate = rate; // 语速（0.1-10，默认1）
        utterance.pitch = pitch; // 音高（0-2，默认1）
        // volume：音量（0-1，默认1）
        speechSynthesis.cancel(); speechSynthesis.speak(utterance);
    } else {
        dnotify("暂时无法播放声音，请检查网络和设备音量。");
    }
}

function listHanzi(target, val, size) {
  console.log('listHanzi..', target, val, size);
  target.innerHTML = ''
  size = size || 75
  val && val.trim() && myCharDataLoader(val, (data) => {
    for (var i = 0; i < data.strokes.length; i++) {
      var strokesPortion = data.strokes.slice(0, i + 1);
      renderFanningStrokes(target, strokesPortion, size);
    }
  })
}

function renderFanningStrokes(target, strokes, size) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style = `width: ${size}px; height: ${size}px; border: 1px solid #EEE; margin-right: 3px`
  target.appendChild(svg);
  var group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  var transformData = HanziWriter.getScalingTransform(size, size);
  group.setAttributeNS(null, 'transform', transformData.transform);
  svg.appendChild(group);

  strokes.forEach(function (strokePath, ind) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttributeNS(null, 'd', strokePath);
    path.style.fill = '#555';
    if (ind === strokes.length - 1) path.style.fill = '#ff6347'; // 最后一个笔画不填充颜色（即不闭合路径
    group.appendChild(path);
  });
}

function aniHanzi(target, val, size) {
  target.innerHTML = ''
  size = size || Math.min(150, Math.floor((window.innerWidth - 60) / 2))
  let writer = HanziWriter.create(target, val, {
    charDataLoader: myCharDataLoader,
    width: size,
    height: size,
    showCharacter: false,
    padding: 5,
    strokeAnimationSpeed: 1, // 动画速度
    delayBetweenStrokes: 500, // 每个笔画之间的间隔时间 ms
  });
  writer.loopCharacterAnimation();
  return writer;
}

function writeHanzi(target, val, size, callback) {
  target.innerHTML = ''
  size = size || Math.min(150, Math.floor((window.innerWidth - 60) / 2))
  let writer = HanziWriter.create(target, val, {
    charDataLoader: myCharDataLoader,
    width: size,
    height: size,
    showCharacter: false,
    showHintAfterMisses: 2,
    padding: 5,
  });
  writer.quiz({
    onCorrectStroke: function(strokeData) {
      console.log(strokeData);
      callback && callback(strokeData, strokeData.strokeNum + 1, strokeData.strokeNum + 1 + strokeData.strokesRemaining);
    },
    // onComplete: function(summaryData) {}
  });
  return writer;
}

async function myCharDataLoader(char, onComplete, onError) {
  try {
    await loadScripts()
    if (!window.writerData?.[char]) await loadScripts('js/lib/dataWriter1.js')
    if (!window.writerData?.[char] && !window.writerData1?.[char]) await loadScripts('js/lib/stroke-supplement.js')
    const data = window.writerData?.[char] || window.writerData1?.[char] || window.writerSupplement?.[char]
    if (!data) throw Error('缺少笔画数据')
    onComplete(data)
  } catch (error) {
    dnotify('笔画暂时加载失败，请返回学习后重试。', 5000)
    if (onError) onError(error)
  }
}

window.dnotifyTimer = null
function dnotify(txt, time) {
  clearTimeout(dnotifyTimer)
  if (document.getElementById('dnotify')) {
    document.getElementById('dnotify').textContent = txt
    document.getElementById('dnotify').style.display = 'block';
  } else {
    var notEle = document.createElement('div');
    notEle.id = 'dnotify'
    notEle.textContent = txt;
    notEle.setAttribute('role', 'status');
    notEle.style = `display: flex; min-width: 0;max-width: calc(100vw - 24px); padding: 6px 12px 6px 12px; color:#333; box-sizing: border-box; border: 1px solid #ebeef5; 
    position: fixed; background-color: #fff; top:10px;right:10px;z-index: 9999999; box-shadow: 0 2px 12px 0 rgba(0,0,0,.1); text-align: center;justify-content: center;
    transition: opacity .3s,transform .3s,left .3s,right .3s,top .4s,bottom .3s;  overflow: hidden;font-size: 14px;line-height: 1.4; border-radius: 8px; `
    document.body.append(notEle)
  } 
  dnotifyTimer = setTimeout(function(){ document.getElementById('dnotify').style.display = 'none'; }, time ? time : 3000)
}

function getRandomColor(maxRGBValue = 180) {
    // 确保 maxRGBValue 在合理范围内
    maxRGBValue = Math.min(255, Math.max(0, maxRGBValue));

    // 生成红、绿、蓝分量，每个分量都在 0 到 maxRGBValue 之间
    const r = Math.floor(Math.random() * (maxRGBValue + 1));
    const g = Math.floor(Math.random() * (maxRGBValue + 1));
    const b = Math.floor(Math.random() * (maxRGBValue + 1));

    // 将RGB值转换为十六进制字符串，并确保是两位数
    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// var writer = HanziWriter.create('docs-target-7', '测', {
//   width: size,
//   height: size,
//   showCharacter: false,
//   showHintAfterMisses: 3,
//   padding: 5,
//   strokeAnimationSpeed: 1, // 动画速度
//   delayBetweenStrokes: 500, // 每个笔画之间的间隔时间 ms
// });
// writer.quiz();
// document.getElementById('docs-target-7-button').addEventListener('click', function () {
//   writer.quiz();
// });
// document.getElementById('animate-button').addEventListener('click', function() {
//   writer.animateCharacter();
// });
