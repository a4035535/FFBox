// import { Socket } from "dgram";
const ipc = require('electron').ipcRenderer;
const remote = require('electron').remote;
const spawn = require('child_process').spawn;
const Store = require('electron-store');
const store = new Store();
const currentWindow = remote.getCurrentWindow();
const versionString = "1.0";
const versionNumber = 1;


/* #region 参数列表定义 */

	/* 参数表参数顺序：参数短名、参数长名（列表中显示）、icon 名称、icon 偏移数、描述 */
	const paralist = require('./paralist.js');
	paralist_format_format = paralist.paralist_format_format;
	paralist_format_hwaccel = paralist.paralist_format_hwaccel;
	paralist_video_vcodec = paralist.paralist_video_vcodec;
	paralist_video_hwencode = paralist.paralist_video_hwencode;
	paralist_video_resolution = paralist.paralist_video_resolution;
	paralist_video_fps = paralist.paralist_video_fps;
	paralist_audio_acodec = paralist.paralist_audio_acodec;

	paralist_video_detail = paralist.paralist_video_detail;

/* #endregion */



/* #region 窗口大小适应 */

	var ScreenHeight, ScreenWidth;
	function ChangeSize() {
		ScreenHeight = document.documentElement.clientHeight - 2;
		ScreenWidth = document.documentElement.clientWidth;
		// document.getElementById("body").style.height = ScreenHeight + "px";
		console.log("窗口大小：" + document.documentElement.clientWidth + "x" + ScreenHeight);
		// document.getElementById("main-bgpic").style.height = ScreenHeight + "px"
		// document.getElementById("article-backgroundfade").style.height = ScreenHeight * 0.2 + "px"
		itemSelectionStyleCalc(true);
	}
	window.onload = function () {
		ChangeSize();	
	}
	window.onresize = ChangeSize;

	// let ws;
	var ws;
	function initws () {
		ws = new WebSocket("ws://localhost:6690/");
		ws.onopen = function (event) {
			console.log("Connected.");
			ws.send("Hello! This is electron.");
		}
		ws.onclose = function (event) {
			console.log("Connection closed.");
		}
		ws.onerror = function (event) {
			console.log(event);
		}	
	}
	function sendMsg (message) {
		if (ws.readyState == 1) {
			ws.send("Sended.");
		} else {
			console.log("service is not available");
		}
	}


/* #endregion */



/* #region 窗口三按钮和外来关闭确认 */

	var isMaximized;
	function closeConfirm () {			// 关闭窗口事件触发时调用
		if (queueTaskNumber) {
			var taskLeftNumber = 0;
			for (const taskID of taskOrder) {
				var taskStatus = window["vue_taskitem_" + ("000" + taskID).slice(-4)].info.status;
				if (taskStatus == 0 || taskStatus == 1 || taskStatus == 2) {			// 未开始、正在进行、暂停
					taskLeftNumber++;
				}
			}
			document.getElementById("messagebox").style.visibility = "visible"
			document.getElementById("messagebox-contenttext").innerHTML = "您还有 " + taskLeftNumber + " 个任务未完成，要退出🐴？"
		} else {
			readyToClose();
		}
	}
	function readyToClose () {			// 确认关闭窗口
		// ffmpeg.kill();
		ipc.send('exitConfirm');
		ipc.send('close');
	}
	ipc.on("exitConfirm", closeConfirm);
	document.getElementById("close").addEventListener("click", closeConfirm);
	document.getElementById("windowmode").addEventListener("click", function () {
		// ipc.send('windowmode');
		if (currentWindow.isMaximized() || isMaximized == true) {
			currentWindow.unmaximize();
			isMaximized = false;
		} else {
			currentWindow.maximize();
			isMaximized = true;
		}
	});
	document.getElementById("minimum").addEventListener("click", function () {
		// ipc.send('minimum');
		currentWindow.minimize();
	});

	function closeMsgbox () {
		document.getElementById("messagebox").style.visibility = "hidden"
	}

/* #endregion */



/* #region 调试机关 */

	var clickSpeedCounter = 0;
	var clickSpeedTimer;
	var clickSpeedTimerStatus = false;
	function debugLauncher() {
		// var a = Math.random() * 4;
		// pushMsg("色彩消息", parseInt(a));
		clickSpeedCounter += 20;
		if (clickSpeedCounter > 100) {
			// ipc.send("debug");
			currentWindow.openDevTools();
			clickSpeedCounter = 0;
			clearInterval(clickSpeedTimer);
			clickSpeedTimerStatus = false;
		} else if (clickSpeedTimerStatus == false) {
			clickSpeedTimerStatus = true;
			clickSpeedTimer = setInterval(function () {
				if (clickSpeedCounter == 0) {
					clearInterval(clickSpeedTimer);
					clickSpeedTimerStatus = false;
				}
				clickSpeedCounter -= 1;
			}, 70)
		}
	}

/* #endregion */



/* #region Vue 定义和计算器 */

	const vue_computed_global = {
		// 根据值输出滑块百分比，用到这些计算器的地方是 calcParaDetail()
		// 对应的反操作函数为 sliderToPara (sliderObj, sliderPercent)
		video_detail_crf51_percent: function () {
			var sliderPercent = (51 - this.data.video_detail.crf51) / 51;
			return sliderPercent * 100 + "%;";
		},
		video_detail_crf63_percent: function () {
			var sliderPercent = (63 - this.data.video_detail.crf63) / 63;
			return sliderPercent * 100 + "%;";
		},
		video_detail_qp51_percent: function () {
			var sliderPercent = (51 - this.data.video_detail.qp51) / 51;
			return sliderPercent * 100 + "%;";
		},
		video_detail_qp70_percent: function () {
			var sliderPercent = (70 - this.data.video_detail.qp70) / 70;
			return sliderPercent * 100 + "%;";
		},
		video_detail_vbitrate_percent: function () {
			var sliderPercent = Math.log2(this.data.video_detail.vbitrate.slice(0, -5) / 64) / 12;
			return sliderPercent * 100 + "%;";
		},
		video_detail_q100_percent: function () {
			var sliderPercent = this.data.video_detail.q100 / 100;
			return sliderPercent * 100 + "%;";
		},
		video_detail_preset_long_percent: function () {
			var video_preset_list = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo"];
			var sliderPercent = video_preset_list.indexOf(this.data.video_detail.preset_long) / 9;
			return sliderPercent * 100 + "%;";
		},
		video_detail_preset_short_percent: function () {
			var video_preset_list = ["veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"];
			var sliderPercent = video_preset_list.indexOf(this.data.video_detail.preset_short) / 6;
			return sliderPercent * 100 + "%;";
		},
		audio_bitrate_percent: function () {
			var sliderPercent = Math.log2(this.data.audio_bitrate.slice(0, -5) / 8) / 6;
			return sliderPercent * 100 + "%;";
		},
		audio_vol_percent: function () {
			var sliderPercent = (this.data.audio_vol.substring(0, this.data.audio_vol.indexOf(" ")) - (-48)) / 96;
			return sliderPercent * 100 + "%;";
		},
		// 输出分辨率换行显示
		video_resolution_htmlCP: function () {
			return this.data.video_resolution == "不改变" ? "不改变" : this.data.video_resolution.slice(0, this.data.video_resolution.indexOf("x")) + "<br />" + this.data.video_resolution.slice(this.data.video_resolution.indexOf("x") + 1);
		},
		// 计算码率模式
		video_ratenum: function () {
			switch (this.data.video_detail.ratecontrol) {
				case "CRF":
					switch (this.data.video_vencoder) {
						case "h264": case "hevc": case "av1": case "vp9": case "vp8": case "h264_nvenc": case "hevc_nvenc":
							return this.data.video_detail.crf51;
						case "vp9": case "vp8":
							return this.data.video_detail.crf63;
					}
					break;
				case "CQP":
					switch (this.data.video_vencoder) {
						case "h264":
							return this.data.video_detail.qp70;
						case "h264_nvenc": case "hevc_nvenc": case "h264_amf": case "h264_qsv": case "hevc_qsv": case "hevc_amf":
							return this.data.video_detail.qp51;
						}
					break;
				case "ABR": case "CBR":
					return getFormattedBitrate(getKbpsValue(this.data.video_detail.vbitrate));
				case "Q":
					return this.data.video_detail.q100;
			}
		},
		getTimeString: function () {
			return getTimeString(this.info.duration);
		},
		// 仪表盘
		// 计算方式：(log(数值) / log(底，即每增长多少倍数为一格) + 数值为 1 时偏移多少格) / 格数
		// 　　　或：(log(数值 / 想要以多少作为最低值) / log(底，即每增长多少倍数为一格)) / 格数
		dashboard_bitrate: function () {
			var value = Math.log(this.info.currentBitrate_smooth / 0.064) / Math.log(8) / 4;		// 0.064, 0.5, 4, 32, 256
			if (value == Infinity) { value = 1; }
			return "background: conic-gradient(#36D 0%, #36D " + value * 75 + "%, #DDD " + value * 75 + "%, #DDD 75%, transparent 75%);";
		},
		dashboard_speed: function () {
			var value = Math.log(this.info.currentSpeed_smooth / 0.04) / Math.log(5) / 6;			// 0.04, 0.2, 1, 5, 25, 125, 625
			return "background: conic-gradient(#36D 0%, #36D " + value * 75 + "%, #DDD " + value * 75 + "%, #DDD 75%, transparent 75%);";
		},
		dashboard_time: function () {
			var valueOdd = this.info.currentTime_smooth % 2;
			if (valueOdd > 1) { valueOdd = 1; }
			var valueEven = this.info.currentTime_smooth % 2 - 1;
			if (valueEven < 0) { valueEven = 0; }
			return "background: conic-gradient(#DDD 0%, #DDD " + valueEven * 75 + "%, #36D " + valueEven * 75 + "%, #36D " + valueOdd * 75 + "%, #DDD " + valueOdd * 75 + "%, #DDD 75%, transparent 75%);";
		},
		dashboard_frame: function () {
			var valueOdd = this.info.currentFrame_smooth % 2;
			if (valueOdd > 1) { valueOdd = 1; }
			var valueEven = this.info.currentFrame_smooth % 2 - 1;
			if (valueEven < 0) { valueEven = 0; }
			return "background: conic-gradient(#DDD 0%, #DDD " + valueEven * 75 + "%, #36D " + valueEven * 75 + "%, #36D " + valueOdd * 75 + "%, #DDD " + valueOdd * 75 + "%, #DDD 75%, transparent 75%);";	
		}
	}
	var vue_global = new Vue({
		el: '#parabox',
		data: {
			data: {						// 多套一个 data 是为了能让 vue 之间拷贝变量
				format_format: '',
				format_moveflags: '',	// 开关
				format_hwaccel: '',
				video_vcodec: '',
				video_hwencode: '',
				video_resolution: '',
				video_fps: '',
				video_vencoder: '',		// 这个是计算出来的数据，不保存不读取
				// 以下依据视频编码器自动选择是否显示
				video_detail: {
					preset_long: '',
					preset_short: '',
					preset: '',
					tune: '',
					profile: '',
					level: '',
					quality: '',
					ratecontrol: '',
					crf51: '',
					crf63: '',
					qp51: '',
					qp70: '',
					q100: '',
					vbitrate: '',
					pixelfmt: ''
				},
				// 音频
				audio_enable: '',		// 开关
				audio_acodec: '',
				audio_bitrate: '',
				audio_vol: ''	
			}
		},
		computed: vue_computed_global
	});
	function getKbpsValue (text) {			// 传入 "xxx kbps"，返回 xxx
		return parseInt(text.slice(0, -5));
	}
	function getFormattedBitrate (Kbps) {	// 传入 xxx，返回 "xxx kbps" 或 "xxx Mbps"
		return Kbps < 1000 ? Kbps + " kbps" : (Kbps / 1000).toFixed(1) + " Mbps";
	}
	function getTimeString (timeValue) {	// 传入秒数，返回 --:--:--.--
		if (timeValue != -1) {
			var Hour = parseInt(timeValue / 3600);
			var Minute = parseInt((timeValue - Hour * 3600) / 60);
			var Second = timeValue - Hour * 3600 - Minute * 60;
			return ("0" + Hour).slice(-2) + ":" + ("0" + Minute).slice(-2) + ":" + ("0" + Second.toFixed(2)).slice(-5);	
		} else {
			return "时长未知"
		}
	}
	function getTimeValue (timeString) {	// 传入 --:--:--.--，返回秒数
		if (timeString != "N/A") {
			var seconds = timeString.slice(0, 2) * 3600 + timeString.slice(3, 5) * 60 - (-timeString.slice(6));
			if (seconds > 0) {
				return seconds;
			} else {
				return -1;
			}
		} else {
			return -1;
		}
	}

/* #endregion */



/* #region ffmpeg 对象 */

	var FFmpegInstalled = false;
	var FFmpegs = [];						// 所有任务的 FFmpeg 对象，key 为 task id
	var taskProgress = [];					// 用于动态显示进度
	var taskProgress_size = [];				// 因为 size 的更新速度很慢，所以单独拎出来
	var dashboardTimers = [];				// 放定时器，用于暂停后恢复
	var commandwin_output = document.getElementById("commandwin-output");

	// 传入头尾字符串，抽取字符串中间的部分，并返回字符串和抽取后的位置
	function selectString (text, pre, post, begin, includePostLength = false) {
		var outText;
		var outPos = -1;
		var prePos = text.indexOf(pre, begin);
		if (prePos != -1) {
			var postPos = text.indexOf(post, prePos + pre.length);
			if (postPos != -1) {
				outText = text.slice(prePos + pre.length, postPos);
				outPos = postPos;
				if (includePostLength) {
					outPos += post.length;
				}
			}
		}
		return {text: outText, pos: outPos};
	}
	// 带初始位置和结束位置的 replace
	function replaceString (text, searchValue, replaceValue, start, end) {
		var front = text.slice(0, start);
		var mid = text.slice(start, end);
		while (mid.indexOf(searchValue) != -1) {
			mid = mid.replace(searchValue, replaceValue);
		}
		var rear = text.slice(end);
		return front + mid + rear;
	}

	class FFmpeg {
		constructor (func, params) {		// 构造器，传入 func: 0: 直接执行 ffmpeg　1: 检测 ffmpeg 版本　２：多媒体文件信息读取
			this.cmd = spawn("ffmpeg", params, {
				detached: false,
				shell: func == 1 ? true : false,
				encoding: 'utf8'
			});

			if (func) {
				this.getSingleMsg = true;
			} else {
				this.getSingleMsg = false;
			}
			this.status = 1;				// -1：已结束；0：暂停；1：可能在运行
			this.requireStop = false;		// 如果请求提前停止，那就不触发 finished 事件
			this.criticalCount = 0;			// 发生 critical 了就不触发 finished 事件
			this.stdoutBuffer = "";
			// this.stderrBuffer = "";
			this.stdoutTimer = 0;
			// this.stderrTimer = 0;
			this.timeoutTimer = 0;
			// 之所以要用 setInterval，是因为进程管道会遇到消息中途截断的问题
			this.cmd.stdout.on('data', (data) => {
				this.stdoutProcessing(data);
			});
			this.cmd.stderr.on('data', (data) => {
				this.stdoutProcessing(data);
			});

			this.events = {}					// 可用事件：🔵timeout 🔵data 🔵finished 🔵status 🔵version 🔵metadata 🔵critical 🔵error
		}
		stdoutProcessing (data) {
			this.stdoutBuffer += data.toString();
			clearInterval(this.timeoutTimer);
			this.timeoutTimer = setTimeout(() => {
				if (this.status == 1) {
					this.forceKill();
					this.emit("timeout");													// 🔵 timeout	
				}
			}, 40000);
			clearInterval(this.stdoutTimer);
			this.stdoutTimer = setTimeout(() => {
				this.dataProcessing(this.stdoutBuffer);
				this.stdoutBuffer = "";
			}, 5);
		}
		dataProcessing (dataText) {				// FFmpeg 传回的数据处理总成
			console.log(dataText);
			this.emit("data", dataText);		// 触发 data 事件，并传回数据字符串
			
			if (dataText.indexOf("Conversion failed") != -1) {								// 🔵 critical：因错误而终止
				this.criticalCount++;
				this.emit("critical", "转码失败");
				this.status = -1;
			} else if (dataText.indexOf("[") != -1 && dataText.indexOf("@") != -1) {		// 编解码器或分离器发来信息
				if (dataText.indexOf("out of memory") != -1) {											// 🔵 error：（例：[hevc_nvenc @ 0000022af783e7c0] OpenEncodeSessionEx failed: out of memory (10)）
					this.emit("error", "内存不足。", dataText);
				} else if (dataText.indexOf("No NVENC capable devices found") != -1) {					// 🔵 error：
					this.emit("error", "没有可用的 NVIDIA 硬件编码设备。", dataText);
				} else if (dataText.indexOf("hwaccel initialisation returned error") != -1) {			// 🔵 error：（例：Failed setup for format cuda: hwaccel initialisation returned error）
					this.emit("warning", "硬件解码器发生错误，将使用软件解码。", dataText);
				} else if (dataText.indexOf("DLL amfrt64.dll failed to open") != -1) {					// 🔵 error：
					this.emit("error", "AMD 编码器初始化失败。", dataText);
				} else if (dataText.indexOf("codec not currently supported in container") != -1) {		// 🔵 error：（例：[mp4 @ 000001d2146edf00] Could not find tag for codec ansi in stream #0, codec not currently supported in container），容器不支持
					this.emit("error", "容器不支持当前编码，请尝试更换容器（格式）或编码。", dataText);
				} else if (dataText.indexOf("unknown codec") != -1) {		// 🔵 error：（例：[mov,mp4,m4a,3gp,3g2,mj2 @ 000002613bc8c540] Could not find codec parameters for stream 0 (Video: none (HEVC / 0x43564548), none, 2560x1440, 24211 kb/s): unknown codec
					this.emit("error", "文件中的某些编码无法识别。", dataText);
				}
			} else if (dataText.indexOf("Error") != -1) {									// 🔵 error：
				if (dataText.indexOf("No space left on device") != -1) {
					this.emit("error", "外存空间不足。", dataText);
				}
			} else if (dataText.indexOf("video:") != -1) {									// 🔵 finished（放 frame= 的前面，因为最后一次输出跟上一次输出可能同时收到（带有 frame=）
				setTimeout(() => {				// 避免存储空间已满时也会产生 finished
					if (!this.requireStop && this.criticalCount == 0) {
						this.emit("finished");
						console.log("FFmpeg finished.");
						this.status = -1;
					}						
				}, 100);
			} else if (dataText.indexOf("frame=") != -1) {									// 🔵 status
				// dataText = " " + dataText;
				var equalPos;		// 当前参数等号的位置或当前参数等号加空格 + 1 的位置
				var prePos = 0;		// 当前参数前空格的位置 + 1
				var postPos;
				var frame, fps, q, size, time, bitrate, speed;
				while ((equalPos = dataText.indexOf("=", equalPos + 1)) != -1) {
					var paraName = dataText.slice(prePos, equalPos);
					while (dataText[++equalPos] == " ") {}			// 跟随空格一路前进过去
					postPos = dataText.indexOf(" ", equalPos);
					var paraValue = dataText.slice(equalPos, postPos);
					switch (paraName) {
						case "frame": frame = paraValue; break;
						case "fps": fps = paraValue; break;
						case "q": q = paraValue; break;
						case "size": size = paraValue; break;
						case "time": time = paraValue; break;
						case "bitrate": bitrate = paraValue; break;
						case "speed": speed = paraValue; break;
					}
					prePos = postPos + 1;
				}
				this.emit("status", frame, fps, q, size, time, bitrate, speed);
			} else if (dataText.indexOf("Input") != -1) {									// 🔵 metadata：获得媒体信息
				var filename, format, currentPos, format_display, duration, overall_bitrate;
				// 先把括号里的逗号去掉
				var front = 0, rear = 0;
				while ((front = dataText.indexOf("(", front)) != -1) {
					rear = dataText.indexOf(")", front);
					dataText = replaceString(dataText, ",", "`", front, rear);
					front = rear;
				};
				currentPos = dataText.indexOf("Input");
				({text: format, pos: currentPos} = selectString(dataText, ", ", ", from", currentPos));
				switch (format) {
					case "avi":
						format_display = "AVI";
						break;
					case "flv":
						format_display = "FLV";
						break;
						case "mov,mp4,m4a,3gp,3g2,mj2":
						// ({text: format_display, pos: currentPos} = selectString(dataText, "major_brand     : ", "\n", currentPos));
						format_display = "MP4";
						break;
					case "asf":
						format_display = "WMV";
						break;
					case "matroska,webm":
						// ffmpeg 读不出来，判断放在下面
						break;
					default:
						format_display = format;
						break;
				}
				({text: filename, pos: currentPos} = selectString(dataText, "from '", "'", currentPos));
				({text: duration, pos: currentPos} = selectString(dataText, "Duration: ", ", ", currentPos));
				({text: overall_bitrate, pos: currentPos} = selectString(dataText, "bitrate: ", " kb/s", currentPos));
				// 循环读取流
				var video_paraline, audio_paraline;
				var video_vcodec, video_pixelfmt, video_resolution, video_bitrate, video_fps;
				var audio_acodec, audio_samplerate, audio_bitrate;
				var video_enabled = false, audio_enabled = false;
				while ((currentPos = dataText.indexOf("Stream", currentPos)) != -1) {
					if (dataText[currentPos + 7] == "m") {		// Stream mapping: 日后更新

						currentPos += 15;
					} else if (dataText[currentPos + 12] == "-") {		// Stream #0:0 -> #0:0 (hevc (native) -> h264 (libx264))

						currentPos += 11;
					} else {
						var streamType;
						({text: streamType, pos: currentPos} = selectString(dataText, ": ", ": ", currentPos));
						if (streamType == "Video") {
							video_enabled = true;
							// 读取视频行
							({text: video_paraline, pos: currentPos} = selectString(dataText, ": ", "\n", currentPos));
							var video_paraItems = video_paraline.split(", ");
							video_vcodec = video_paraItems[0];
							if (video_vcodec.indexOf("(") != -1) {
								video_vcodec = video_vcodec.slice(0, video_vcodec.indexOf("(") - 1);
							}
							video_pixelfmt = video_paraItems[1];
							video_resolution = video_paraItems[2];
							if (video_resolution.indexOf("[") != -1) {
								video_resolution = video_resolution.slice(0, video_resolution.indexOf(" ["));
							}
							video_bitrate = video_paraItems.find((element) => {return element.indexOf("kb/s") != -1;});
							video_bitrate = video_bitrate == undefined ? undefined : video_bitrate.slice(0, -5);
							video_fps = video_paraItems.find((element) => {return element.indexOf("fps") != -1;});
							video_fps = video_fps == undefined ? undefined : video_fps.slice(0, -4);
							if (format == "matroska,webm") {
								if (video_vcodec == "h264" || video_vcodec == "hevc") {
									format_display = "MKV";
								} else if (video_vcodec == "vp9" || video_vcodec == "vp8") {
									format_display = "webm";
								} else {
									format_display = "(MKV)";
									pushMsg(filename + "：FFmpeg 暂无法判断该文件格式为 MKV 或为 webm。")
								}
							}
						} else if (streamType == "Audio") {
							audio_enabled = true;
							// 读取音频行
							({text: audio_paraline, pos: currentPos} = selectString(dataText, ": ", "\n", currentPos));
							var audio_paraItems = audio_paraline.split(", ");
							audio_acodec = audio_paraItems[0];
							if (audio_acodec.indexOf("(") != -1) {
								audio_acodec = audio_acodec.slice(0, audio_acodec.indexOf("(") - 1);
							}
							audio_samplerate = audio_paraItems.find((element) => {return element.indexOf("Hz") != -1;});
							audio_samplerate = audio_samplerate == undefined ? undefined : audio_samplerate.slice(0, -3);
							audio_bitrate = audio_paraItems.find((element) => {return element.indexOf("kb/s") != -1;});
							if (audio_bitrate != undefined) {
								if (audio_bitrate.indexOf("(") != -1) {
									audio_bitrate = audio_bitrate.slice(0, audio_bitrate.indexOf("(") - 1);
								}
								audio_bitrate = audio_bitrate.slice(0, -5)
							}
						} else if (streamType == "Subtitle") {
							// 日后更新
						} 	
					}
				};
				if (video_enabled == false && audio_bitrate != undefined) {
					audio_bitrate = overall_bitrate.slice(0, -5)
				}
				if (audio_enabled == false && video_bitrate != undefined) {
					video_bitrate = overall_bitrate.slice(0, -5)
				}
				this.emit("metadata", format_display, duration, video_vcodec, video_resolution, video_bitrate, video_fps, audio_acodec, audio_bitrate);
				if (this.getSingleMsg) {
					this.status = -1;
				}
			} else if (dataText.indexOf("'ffmpeg'") != -1) {											// 🔵 version：'ffmpeg' 不是内部或外部命令，也不是可运行的程序
				this.emit("version", null);
				this.status = -1;
			} else if (dataText.indexOf("Invalid data") != -1) {							// 🔵 critical：发生错误（Invalid data found when processing input）
				this.criticalCount++;
				this.emit("critical", "文件格式不支持");
				this.status = -1;
			} else if (dataText.indexOf("No such") != -1) {									// 🔵 critical：发生错误（No such file or directory）
				this.criticalCount++;
				this.emit("critical", "不是一个文件");
				this.status = -1;
			} else if (dataText.indexOf("version") != -1) {									// 🔵 version：找到 ffmpeg，并读出版本，需要放在读取文件信息后，也要放在“Conversion”后
				if (this.getSingleMsg) {
					this.emit("version", dataText.substring(dataText.indexOf("version") + 8, dataText.indexOf("Copyright") - 1));
					this.status = -1;
				}
			}
		}
		on (key, callback) {
			this.events[key] = callback;	// 将 key 与对应的 callback 添加到 events 对象中
		}
		emit (key, ...args) {
			if (this.events[key] != undefined) {
				this.events[key](args);				// 执行 events 中 key 对应的事件
			}
		}
		kill () {
			this.cmd.kill();
			this.cmd.on("close", function () {
				console.log("ffmpeg killed = " + this.cmd.killed);
				this.status = -1;
				callback();
			});
		}
		forceKill () {
			spawn("taskkill", ["/F", "/PID", this.cmd.pid], {
				detached: false,
				shell: false
			});
			this.status = -1;
		}
		exit (callback) {
			if (this.status == 0) {
				this.resume();
			}
			this.requireStop = true;
			// this.cmd.off("close", () => {});
			this.cmd.on("close", () => {
				console.log("ffmpeg exited.");
				this.status = -1;
				callback();
			});
			this.cmd.stdin.write("q");
		}
		pause () {
			spawn("pauseAndResumeProcess/PauseAndResumeProcess.exe", ["0", this.cmd.pid], {
				detached: false,
				shell: false
			});
			this.status = 0;
		}
		resume () {
			spawn("pauseAndResumeProcess/PauseAndResumeProcess.exe", ["1", this.cmd.pid], {
				detached: false,
				shell: false
			});
			this.status = 1;
			clearInterval(this.timeoutTimer);
			this.timeoutTimer = setTimeout(() => {
				if (this.status == 1) {
					this.forceKill();
					this.emit("timeout");									// 🔵 timeout	
				}
			}, 40000);
		}
		sendKey (key) {
			this.cmd.stdin.write(key);
		}
		sendSig (str) {
			this.cmd.kill(str);
		}
	}

	async function initFFmpeg () {
		var ffmpeg = new FFmpeg(1);
		ffmpeg.on("data", (data) => {
			commandwin_output.innerHTML += data + "\n";
			commandwin_output.scrollTop = commandwin_output.scrollHeight - commandwin_output.offsetHeight;
		});
		ffmpeg.on("version", (data) => {
			if (data[0] != null) {
				document.getElementById("ffmpeg-version").innerHTML = "当前 FFmpeg 版本：" + data;
				FFmpegInstalled = true;
			} else {
				document.getElementById("ffmpeg-version").innerHTML = "FFmpeg 未安装或未配置环境变量！";
				document.getElementById("dropfilesimage").setAttribute("src", "image/drop_files_noffmpeg.png");
			}
		})
	}
	initFFmpeg();

/* #endregion */



/* #region 任务处理 */

	var queueTaskNumber = 0;		// 当前队列的任务数，包括正在运行的和暂停的
	var workingTaskNumber = 0;		// 当前正在运行的任务数
	var maxThreads = 4;				// 最大同时运行数
	var workingStatus = 0;			// 0：空闲　1：运行

	// 进度条按 taskArray 里的所有任务之和算（未运行、运行中、暂停、已完成）
	// queueTaskNumber：运行中、暂停
	// workingTaskNumber：运行中
	
	function startNpause () {
		if (workingStatus == 0 && taskOrder.length != 0) {		// 开始任务
			workingStatus = 1;
			document.getElementById("startbutton").className = "startbutton startbutton-yellow";
			document.getElementById("startbutton").innerHTML = "⏸暂停"
		} else if (workingStatus == 1) {						// 暂停任务
			workingStatus = 0;
			document.getElementById("startbutton").className = "startbutton startbutton-green";
			document.getElementById("startbutton").innerHTML = "▶开始"
		}
		taskArrange();
	}
	
	function pauseNremove (id) {
		if (event != undefined) {
			event.stopPropagation();
		}
		switch (window["vue_taskitem_" + ("000" + id).slice(-4)].info.status) {
			case 0:					// 未运行，点击直接删除任务
				taskDelete(id);
				break;
			case 2:					// 已经暂停，点击重置任务
			case 3:					// 运行完成，点击重置任务
				taskReset(id);
				break;
			case 1:					// 正在运行，暂停
				taskPause(id);
				break;
			case -1:				// 啥也不干
				break;
		}
	}

	// workingStatus == 0 状态下调用：把所有任务暂停；workingStatus == 1 状态下调用，按最大运行数运行队列任务
	function taskArrange (startFrom = 0) {
		if (workingStatus == 1) {							// 任务运行，0 变 1，2 变 1
			if (queueTaskNumber == 0) {						// 队列为空，开始进行第一个任务。该功能反函数对应于 overallProgressTimer();
			}
			while (workingTaskNumber < maxThreads) {
				var started = false;
				for (var index = startFrom; index < taskOrder.length; index++) {
					if (window["vue_taskitem_" + ("000" + taskOrder[index]).slice(-4)].info.status == 0) {			// 从还没开始干活的抽一个出来干
						taskStart(taskOrder[index]);
						started = true;
						break;
					} else if (window["vue_taskitem_" + ("000" + taskOrder[index]).slice(-4)].info.status == 2) {	// 从暂停开始干活的抽一个出来干
						taskResume(taskOrder[index]);
						started = true;
						break;
					}
				}
				if (!started) {			// 遍历完了，没有可以继续开始的任务，停止安排新工作
					break;
				}
			}
			if (queueTaskNumber == 0) {	// 上面搞完了还是一个任务都没有开始，甭开始了
				startNpause();
			} else {					// 队列中有任务了
				if (workingTaskNumber == 0) {			// 队列中有任务，但都暂停了
					overallProgressTimer();
				} else {
					titlebar.className = "running";		// 这句实际上只在第一个任务开始时有实际作用
					// 需要暂停一下再开始，否则第一个任务运行时就没有 timer 或者重复运行 timer 了
					clearInterval(overallProgressTimerID);
					overallProgressTimerID = setInterval(() => {
						overallProgressTimer();
					}, 80);
					progressbar.className = "titlebar-background-green";
				}
			}
		} else {											// 任务暂停，1 变 2
			for (const taskO of taskOrder) {
				if (window["vue_taskitem_" + ("000" + taskO).slice(-4)].info.status == 1) {			// 把所有正在干活的都暂停
					taskPause(taskO);
				}
			}
			overallProgressTimer();
		}
		overallProgressTimer();
	}

	function dashboardTimer (id) {
		// 普通处理区域
		var index = taskProgress[id].length - 1;		// 上标 = 长度 - 1
		var avgTotal = 6, avgCount = 0;					// avgTotal 为权重值，每循环一次 - 1；avgCount 每循环一次加一次权重
		var deltaSysTime = 0, deltaFrame = 0, deltaTime = 0;
		while (index > 1 && taskProgress[id].length - index < 6) {													// 数据量按最大 6 条算，忽略第 1 条
			deltaSysTime += (taskProgress[id][index][0] - taskProgress[id][index - 1][0]) * avgTotal;				// x 轴
			deltaFrame += (taskProgress[id][index][1] - taskProgress[id][index - 1][1]) * avgTotal;					// y 轴
			deltaTime += (taskProgress[id][index][2] - taskProgress[id][index - 1][2]) * avgTotal;					// y 轴
			avgCount += avgTotal;
			avgTotal--;
			index--;
		}
		deltaSysTime /= avgCount; deltaFrame /= avgCount; deltaTime /= avgCount;							// 取平均
		index = taskProgress[id].length - 1;			// 上标 = 长度 - 1
		var frameK = (deltaFrame / deltaSysTime); var frameB = taskProgress[id][index][1] - frameK * taskProgress[id][index][0];		// b = y1 - x1 * k;
		var timeK = (deltaTime / deltaSysTime); var timeB = taskProgress[id][index][2] - timeK * taskProgress[id][index][0];

		// size 专属处理区域
		var index = taskProgress_size[id].length - 1;	// 上标 = 长度 - 1
		var avgTotal = 3, avgCount = 0;					// avgTotal 为权重值，每循环一次 - 1；avgCount 每循环一次加一次权重
		var deltaSysTime = 0, deltaSize = 0;
		while (index > 0 && taskProgress_size[id].length - index < 3) {												// 数据量按最大 3 条算，无需忽略第 1 条
			deltaSysTime += (taskProgress_size[id][index][0] - taskProgress_size[id][index - 1][0]) * avgTotal;		// x 轴
			deltaSize += (taskProgress_size[id][index][1] - taskProgress_size[id][index - 1][1]) * avgTotal;		// y 轴
			avgCount += avgTotal;
			avgTotal--;
			index--;
		}
		deltaSysTime /= avgCount; deltaSize /= avgCount;	// 取平均
		index = taskProgress_size[id].length - 1;		// 上标 = 长度 - 1
		var sizeK = (deltaSize / deltaSysTime); var sizeB = taskProgress_size[id][index][1] - sizeK * taskProgress_size[id][index][0];

		var sysTime = new Date().getTime() / 1000;
		var currentFrame = frameK * sysTime + frameB;
		var currentTime = timeK * sysTime + timeB;		// 单位：s
		var currentSize = sizeK * sysTime + sizeB;		// 单位：kB
		// console.log("currentFrame: " + currentFrame + ", currentTime: " + currentTime + ", currentSize: " + currentSize);

		// 界面显示内容：码率、速度、时间、帧
		// 计算方法：码率：Δ大小/Δ时间　速度：（带视频：Δ帧/视频帧速/Δ系统时间　纯音频：Δ时间/Δ系统时间（秒））　时间、帧：平滑
		var thisVue = window["vue_taskitem_" + ("000" + id).slice(-4)];
		if (thisVue.info.duration != -1) {
			thisVue.info.progress = currentTime / thisVue.info.duration * 100;
		} else {
			thisVue.info.progress = 50;
		}
		if (thisVue.info.progress < 99.5) {				// 进度满了就别更新了
			thisVue.info.currentBitrate = (sizeK / timeK) * 8 / 1000;
			if (thisVue.info.fps != "-") {				// 可以读出帧速，用帧速算更准确
				thisVue.info.currentSpeed = frameK / thisVue.info.fps;
			} else {
				thisVue.info.currentSpeed = 0;
			}
			thisVue.info.currentTime = currentTime;
			thisVue.info.currentFrame = currentFrame;

			// 平滑处理
			thisVue.info.progress_smooth = thisVue.info.progress_smooth * 0.7 + thisVue.info.progress * 0.3;
			thisVue.info.currentBitrate_smooth = (thisVue.info.currentBitrate_smooth * 0.9 + thisVue.info.currentBitrate * 0.1);
			thisVue.info.currentSpeed_smooth = (thisVue.info.currentSpeed_smooth * 0.6 + thisVue.info.currentSpeed * 0.4);
			thisVue.info.currentTime_smooth = (thisVue.info.currentTime_smooth * 0.7 + thisVue.info.currentTime * 0.3);
			thisVue.info.currentFrame_smooth = (thisVue.info.currentFrame_smooth * 0.7 + thisVue.info.currentFrame * 0.3);
			if (isNaN(thisVue.info.currentBitrate_smooth) || thisVue.info.currentBitrate_smooth == Infinity) {thisVue.info.currentBitrate_smooth = 0;} 
			if (isNaN(thisVue.info.currentSpeed_smooth)) {thisVue.info.currentSpeed_smooth = 0;} 
			if (isNaN(thisVue.info.currentTime_smooth)) {thisVue.info.currentTime_smooth = 0;} 
			if (isNaN(thisVue.info.currentFrame_smooth)) {thisVue.info.currentFrame_smooth = 0;} 
		} else {
			thisVue.info.progress = 100;
		}
	}

	var overallProgressTimerID;
	// 功能 1：承担了有关全局进度显示和标题栏样式的任务
	// 功能 2：检测任务队列是不是空了，以确定开始按钮和总体进度条的显示形式。对应的反函数在 taskArrange() 中
	function overallProgressTimer () {
		if (queueTaskNumber > 0) {					// 队列有任务
            var totalTime = 0;
            var totalProcessedTime = 0;
            for (const taskID of taskOrder) {
                var taskinfo = window["vue_taskitem_" + ("000" + taskID).slice(-4)].info;
                totalTime += taskinfo.duration;
                totalProcessedTime += taskinfo.progress_smooth / 100 * taskinfo.duration;
            }
            var progress = totalProcessedTime / totalTime;
            progressbar.style.width = progress * 100 + "%";
            if (workingTaskNumber > 0) {			// 队列有任务，但都暂停了
				document.getElementById("titletext").innerHTML = "进度：" + (progress * 100).toFixed(3) + " % - 丹参盒 v" + versionString;
				currentWindow.setProgressBar(progress, {mode: "normal"});
			} else {
				progressbar.className = "titlebar-background-yellow";
				currentWindow.setProgressBar(progress, {mode: "paused"});
				clearInterval(overallProgressTimerID);
			}
		} else {									// 完全没任务了
			if (titlebar.className != "idle") {		// 原来还有队列任务，现在进入无任务状态
				if (!currentWindow.isVisible()) {
					currentWindow.flashFrame(true);
				}
				clearInterval(overallProgressTimerID);
			}
			titlebar.className = "idle";
			progressbar.style.width = "0";
			document.getElementById("titletext").innerHTML = "丹参盒 v" + versionString;
			currentWindow.setProgressBar(0, {mode: "none"});
		}
		if (workingTaskNumber == 0) {				// 不管有没有任务，反正不运行了
			workingStatus = 0;
			document.getElementById("startbutton").className = "startbutton startbutton-green";
			document.getElementById("startbutton").innerHTML = "▶开始";
		}
		if (commandwin_output.innerHTML.length > 40000) {	// 输出窗口过长时清理内容，避免导致布局重排性能问题
			commandwin_output.innerHTML = commandwin_output.innerHTML.slice(4000);
		}
	}

	function taskStart (id) {
		window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = 1;
		var taskitem = document.getElementById("taskitem_" + ("000" + id).slice(-4));
		if (taskitem.className == "taskitem-large") {
			taskitem.className = "taskitem-large-run";
		} else {
			taskitem.className = "taskitem-small-run";
		}
		$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-delete").css("background-position-x", "-16px");	// 更改为暂停按钮
		taskProgress[id] = [];
		taskProgress_size[id] = [];
		var newFFmpeg = new FFmpeg(0, getFFmpegParaArray(id, false));
		newFFmpeg.on("finished", () => {
			workingTaskNumber--;
			queueTaskNumber--;
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = 3;
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.progress_smooth = 100;
			if (taskitem.className == "taskitem-large-run") {
				taskitem.className = "taskitem-large";
			} else {
				taskitem.className = "taskitem-small";
			}
			$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-delete").css("background-position-x", "-32px");		// 更改为重置按钮
			$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-background-progress").attr("class", "taskitem-background-progress progress-gray");
			pushMsg("文件【" + window["vue_taskitem_" + ("000" + id).slice(-4)].info.filename + "】已转码完成", 1);
			clearInterval(dashboardTimers[id]);
			taskArrange();
		})
		newFFmpeg.on("status", ([frame, fps, q, size, time, bitrate, speed]) => {
			// 传入计算器内容：系统时间、帧 frame、时间 time、大小 size
			size = size.slice(0, -2);
			taskProgress[id].push([new Date().getTime() / 1000, frame, getTimeValue(time)]);
			if (size != taskProgress_size[id][taskProgress_size[id].length - 1][1]) {	// 有变化才推进去
				taskProgress_size[id].push([new Date().getTime() / 1000, size]);
			}
		})
		newFFmpeg.on("data", (data) => {
			commandwin_output.innerHTML += data + "\n";
			commandwin_output.scrollTop = commandwin_output.scrollHeight - commandwin_output.offsetHeight;
		});
		newFFmpeg.on("error", ([description, data]) => {
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.errorInfo.push(description);
		});
		newFFmpeg.on("warning", ([description, data]) => {
			pushMsg(description, 2);
		});
		newFFmpeg.on("critical", (data) => {		// 跟 finished 的操作差别不大
			workingTaskNumber--;
			queueTaskNumber--;
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = 3;
			if (window["vue_taskitem_" + ("000" + id).slice(-4)].info.progress_smooth == 0) {	// 注：progress 变量在计算是否 < 99.5 时已经改为了 100，但是不会再刷新 progress_smooth
				window["vue_taskitem_" + ("000" + id).slice(-4)].info.progress_smooth = 100;
			}
			if (taskitem.className == "taskitem-large-run") {
				taskitem.className = "taskitem-large";
			} else {
				taskitem.className = "taskitem-small";
			}
			$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-delete").css("background-position-x", "-32px");		// 更改为重置按钮
			$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-background-progress").attr("class", "taskitem-background-progress progress-red");
			var outputString = "文件【" + window["vue_taskitem_" + ("000" + id).slice(-4)].info.filename + "】";
			if (data == "转码失败") {
				outputString += "转码失败。"
				if (window["vue_taskitem_" + ("000" + id).slice(-4)].info.errorInfo.length == 1) {
					outputString += window["vue_taskitem_" + ("000" + id).slice(-4)].info.errorInfo[0];
				} else if (window["vue_taskitem_" + ("000" + id).slice(-4)].info.errorInfo.length) {
					// 上面提交 error 的时候要加句号，这里不加
					window["vue_taskitem_" + ("000" + id).slice(-4)].info.errorInfo.forEach((item, index) => {
						outputString += (index + 1) + ". " + item;
					});
				} else {
					outputString += "请到左侧的指令面板查看详细原因。";
				}
			} else {
				outputString += data;
			}
			pushMsg(outputString, 3);
			clearInterval(dashboardTimers[id]);
			taskArrange();
		})
		newFFmpeg.on("timeout", () => {		// 跟 finished 的操作差别不大
			workingTaskNumber--;
			queueTaskNumber--;
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = 3;
			if (window["vue_taskitem_" + ("000" + id).slice(-4)].info.progress_smooth == 0) {	// 注：progress 变量在计算是否 < 99.5 时已经改为了 100，但是不会再刷新 progress_smooth
				window["vue_taskitem_" + ("000" + id).slice(-4)].info.progress_smooth = 100;
			}
			if (taskitem.className == "taskitem-large-run") {
				taskitem.className = "taskitem-large";
			} else {
				taskitem.className = "taskitem-small";
			}
			$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-delete").css("background-position-x", "-32px");		// 更改为重置按钮
			$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-background-progress").attr("class", "taskitem-background-progress progress-red");
			pushMsg("处理文件【" + window["vue_taskitem_" + ("000" + id).slice(-4)].info.filename + "】时 FFmpeg 超时未响应，已为您结束转码进程<br />请调节参数后重试或将此问题报告至作者", 3);
			clearInterval(dashboardTimers[id]);
			taskArrange();			
		})
		// 需要先推两个 0 状态，不然进度列表是空的
		taskProgress_size[id].push([new Date().getTime() / 1000, 0]);
		taskProgress[id].push([new Date().getTime() / 1000, 0, 0]);
		FFmpegs[id] = newFFmpeg;
		dashboardTimers[id] = setInterval(() => {
			dashboardTimer(id);
		}, 40)
		workingTaskNumber++;
		queueTaskNumber++;
	}

	var lastSysTime;
	function taskPause (id) {
		$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-delete").css("background-position-x", "-32px");	// 更改为重置按钮
		$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-background-progress").attr("class", "taskitem-background-progress progress-yellow");
		window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = 2;
		FFmpegs[id].pause();
		workingTaskNumber--;
		lastSysTime = new Date().getTime() / 1000;
		clearInterval(dashboardTimers[id]);
		taskArrange(id + 1);
	}

	function taskResume (id) {
		$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-delete").css("background-position-x", "-16px");	// 更改为暂停按钮
		$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-background-progress").attr("class", "taskitem-background-progress progress-green");
		window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = 1;
		var nowSysTime = new Date().getTime() / 1000;
		// 加上因暂停而漏掉的时间
		for (const item of taskProgress[id]) {
			item[0] += nowSysTime - lastSysTime;
		}
		for (const item of taskProgress_size[id]) {
			item[0] += nowSysTime - lastSysTime;
		}
		dashboardTimers[id] = setInterval(() => {
			dashboardTimer(id);
		}, 40)
		FFmpegs[id].resume();
		workingTaskNumber++;
	}

	function taskReset (id) {
		// if 语句两个分支的代码重合度很高，区分的原因是因为暂停状态下重置是异步的
		if (window["vue_taskitem_" + ("000" + id).slice(-4)].info.status == 2) {		// 暂停状态下重置
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = -1;
			clearInterval(dashboardTimers[id]);
			FFmpegs[id].exit(() => {
				var taskitem = document.getElementById("taskitem_" + ("000" + id).slice(-4));
				if (taskitem.className == "taskitem-large-run") {
					taskitem.className = "taskitem-large";
				} else {
					taskitem.className = "taskitem-small";
				}
				delete FFmpegs[id];
				queueTaskNumber--;
				$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-delete").css("background-position-x", "0px");		// 更改为删除按钮
				$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-background-progress").attr("class", "taskitem-background-progress progress-green");
				window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = 0;
				window["vue_taskitem_" + ("000" + id).slice(-4)].info.progress_smooth = 0;
				taskProgress[id] = [];
				taskProgress_size[id] = [];
				overallProgressTimer();
			});	
		} else if (window["vue_taskitem_" + ("000" + id).slice(-4)].info.status == 3) {	// 完成状态下重置
			$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-delete").css("background-position-x", "0px");		// 更改为删除按钮
			$("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-background-progress").attr("class", "taskitem-background-progress progress-green");
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = 0;
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.progress_smooth = 0;
			taskProgress[id] = [];
			taskProgress_size[id] = [];
			overallProgressTimer();
		}
	}

	function taskDelete (id) {
		if (window["vue_taskitem_" + ("000" + id).slice(-4)].info.status == 1 || window["vue_taskitem_" + ("000" + id).slice(-4)].info.status == 2) {	// 运行中或暂停，则还需把 FFmpeg 清掉
			window["vue_taskitem_" + ("000" + id).slice(-4)].info.status = -1;
			FFmpegs[id].exit(() => {
				delete FFmpegs[id];
				taskArray.delete(id);
				taskOrder.splice(taskOrder.indexOf(id), 1);
				queueTaskNumber--;
				document.getElementById("taskitem_" + ("000" + id).slice(-4)).remove();
				window["vue_taskitem_" + ("000" + id).slice(-4)] = undefined;
				overallProgressTimer();
				itemSelectionStyleCalc();
			});	
		} else {
			taskArray.delete(id);
			taskOrder.splice(taskOrder.indexOf(id), 1);
			document.getElementById("taskitem_" + ("000" + id).slice(-4)).remove();
			window["vue_taskitem_" + ("000" + id).slice(-4)] = undefined;
			overallProgressTimer();
			itemSelectionStyleCalc();
		}
	}

/* #endregion */



/* #region 左侧边栏选择、信息中心开关 */

	var currentListSelection = 0;
	function listselect_reset () {
		for (var i = 0; i <= 1; i++) {
			document.getElementById("listselection_" + i).className = "sidebar-selection";
			document.getElementById("listwindow_" + i).className = "listwindow listwindow-unselected"
		}
	}
	function listselect(index) {
		listselect_reset();
		document.getElementById("listselection_" + index).className = "sidebar-selection sidebar-selection-selected";
		document.getElementById("listwindow_" + index).className = "listwindow listwindow-selected"
		currentListSelection = index;
	}

	var currentParaSelection = 0;
	function paraselect_reset () {
		for (var i = 0; i <= 6; i++) {
			document.getElementById("paraselection_" + i).className = "sidebar-selection";
			document.getElementById("parabox_" + i).className = "parabox-content parabox-content-unselected";
		}
	}
	function paraselect(index) {
		paraselect_reset();
		document.getElementById("paraselection_" + index).className = "sidebar-selection sidebar-selection-selected";
		document.getElementById("parabox-name").style.backgroundPositionY = (-40 - index * 20) + "px";
		document.getElementById("parabox_" + index).className = "parabox-content parabox-content-selected";
		currentParaSelection = index;
	}

	var infocenter_open = false;
	function infocenter_select () {
		if (infocenter_open) {
			infocenter_unselect();
		} else {
			infocenter_open = true;
			document.getElementById("infoicon").className = "infoicon-selected";
			document.getElementById("infocenter-main").style.transform = "translateY(0%)";
			document.getElementById("infocenter-main").style.opacity = "1";
			document.getElementById("infocenter-background").style.opacity = "1";
			document.getElementById("infocenter").style.pointerEvents = "all";
		}
	}
	function infocenter_unselect () {
		infocenter_open = false;
		document.getElementById("infoicon").className = "";
		document.getElementById("infocenter-main").style.transform = "translateY(30%)";
		document.getElementById("infocenter-main").style.opacity = "0";
		document.getElementById("infocenter-background").style.opacity = "0";
		document.getElementById("infocenter").style.pointerEvents = "none";

		var popdown = setTimeout(() => {
			if (document.getElementById("infoicon").className == "infoicon-selected") {			// 如果关了马上又开了，那就不做这个操作
				document.getElementById('infocenter-main').className =='invisible';
			}
		}, 300);
	}

/* #endregion */



/* #region 信息中心 */

	var infoList_visible = new Set();
	var infoList_count = 0;
	var infoID_count = 0;
	function pushMsg (text, level = 0) {
		var date = new Date();
		// 消息中心部分
		var infocenter_box = document.getElementById("infocenter-box");
		var infocenter_info = document.createElement("div");
		infocenter_info.className = "infocenter-info";
		infocenter_info.id = "info_" + ("0000" + infoList_count).slice(-5);
		var newInnerHTML = "";
		switch (level) {
			case 0:
				newInnerHTML += '<img src="image/info.svg" />'; break;
			case 1:
				newInnerHTML += '<img src="image/tick.svg" />'; break;
			case 2:
				newInnerHTML += '<img src="image/warning.svg" />'; break;
			case 3:
				newInnerHTML += '<img src="image/error.svg" />'; break;
		}
		newInnerHTML += '<p>' + text + '</p>';
		newInnerHTML += '<span>' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2) + '</span>';
		newInnerHTML += '<div onclick="deleteMsg(' + infoList_count + ')"></div>'
		infocenter_info.innerHTML = newInnerHTML;
		infocenter_box.appendChild(infocenter_info);
		infoList_count++;
		infoID_count++;
		document.getElementById("infocount").innerHTML = infoList_count;
		if (level > 1) {
			var infocount_flash = 6;
			var infocount_flash_timer = setInterval(() => {
				if (infocount_flash % 2 == 0) {
					document.getElementById("infocount").style.color = "transparent";
				} else {
					document.getElementById("infocount").style.color = "";
				}
				if (--infocount_flash == 0) {
					clearInterval(infocount_flash_timer);
				}
			}, 250);
		}

		// 气泡部分
		var contentWrapper = document.getElementById("content-wrapper");
		var popupBox = document.createElement("div");
		switch (level) {
			case 0:
				popupBox.className = "popup-box"; break;
			case 1:
				popupBox.className = "popup-box popup-box-ok"; break;
			case 2:
				popupBox.className = "popup-box popup-box-warning"; break;
			case 3:
				popupBox.className = "popup-box popup-box-error"; break;
		}
		popupBox.id = "popup-box-" + ("0000" + infoID_count).slice(-5);
		newInnerHTML = "";
		newInnerHTML += '<div class="popup-message">';
			newInnerHTML += text;
		newInnerHTML += '</div>';
		popupBox.innerHTML = newInnerHTML;
		contentWrapper.appendChild(popupBox);
		setTimeout(() => {
			popupBox.style.opacity = "1";
		}, 10);
		setTimeout(() => {
			popupBox.style.opacity = "0.5";
		}, 2500 + text.length * 100);
		setTimeout(() => {
			popupBox.style.opacity = "0";
		}, 2800 + text.length * 100);
		setTimeout(() => {
			contentWrapper.removeChild(popupBox);
		}, 3100 + text.length * 100);
	}
	function deleteMsg (index) {
		document.getElementById("info_" + ("0000" + index).slice(-5)).remove();
		infoList_count--;
		document.getElementById("infocount").innerHTML = infoList_count;
	}

/* #endregion */



/* #region 调节参数栏高度、滑动条 */

	var mouseDownX, mouseDownY;
	var initHeight, initLeft, paraIsDragging = false, sliderIsDragging = false;
	var objDragging;											// 用于存放现在在拖哪个滑条、开关
	var dragger = document.getElementById("parabox-dragger");
	var maincontent = document.getElementById("maincontent");
	dragger.onmousedown = dragger.ontouchstart = paraDragStart;
	function paraDragStart (e) {
		mouseDownY = e.pageY || e.touches[0].pageY;													// 鼠标在页面（窗口）内的坐标
		initHeight = document.getElementById("listview").offsetHeight;								// initHeight: listview 的原始 Height
		paraIsDragging = true;
	}
	function switchDragStart (e, obj) {
		mouseDownX = e.pageX || e.touches[0].pageX;													// 鼠标在页面（窗口）内的坐标
		objDragging = obj.id.substring(0, obj.id.indexOf("-"));
		initLeft = document.getElementById(objDragging + "-slipper").offsetLeft;					// initLeft: slider 的原始 x 坐标（注意滑块已经有 transformX(-50%)）
		sliderIsDragging = 3;					// 3 是拖开关的滑块 / 滑轨
		paraDragMove(e);
	}
	function sliderDragStart (e, slider) {
		mouseDownX = e.pageX || e.touches[0].pageX;													// 鼠标在页面（窗口）内的坐标
		objDragging = slider.id.substring(0, slider.id.indexOf("-"));
		initLeft = document.getElementById(objDragging + "-slipper").offsetLeft;					// initLeft: slider 的原始 x 坐标
		if (slider.id.slice(-2) == "er") {		// 1 是拖滑块，2 是拖滑轨
			sliderIsDragging = 1;
		} else {
			sliderIsDragging = 2;
			paraDragMove(e);
		}
		event.stopPropagation();				// 阻止事件冒泡
	}
	maincontent.onmousemove = maincontent.ontouchmove = paraDragMove;
	function paraDragMove (e) {
		if (paraIsDragging) {			// 拖参数高度
			e.preventDefault();		 			// 阻止触摸时浏览器的缩放、滚动条滚动
			var offsetY = parseInt(e.pageY || e.touches[0].pageY) - parseInt(mouseDownY);			// offsetY: 鼠标相比按下时移动的高度
			var finalHeight = initHeight - (-offsetY);												// 这里要减负，否则 js 会当作字符串连接处理
			var fullHeight = document.getElementById("maincontent").offsetHeight;					// fullHeight: maincontent 的总高度
			var listPercent = finalHeight / fullHeight;
			if (listPercent > 0 && listPercent < 1) {
				document.getElementById("listview").style.height = (listPercent * 100) + "%";
				document.getElementById("parabox").style.height = (100 - listPercent * 100) + "%";
			}
			itemSelectionStyleCalc(true);
		} else if (sliderIsDragging == 1 || sliderIsDragging == 2) {
			e.preventDefault();
			var offsetX = parseInt(e.pageX || e.touches[0].pageX) - parseInt(mouseDownX);
			if (sliderIsDragging == 1) {
				var finalLeft = initLeft - (-offsetX);						// 拖滑条，则按鼠标偏移量算。Left 数据滑条自己能读到
			} else {
				var finalLeft = e.pageX - 279;								// 拖轨道，则按鼠标所在位置的绝对坐标算
			}
			var fullWidth = document.getElementById(objDragging + "-module").offsetWidth;	// fullWidth: slider-module 的总宽度
			var sliderPercent = finalLeft / fullWidth;
			if (sliderPercent > 1) {sliderPercent = 1;}
			else if (sliderPercent < 0) {sliderPercent = 0;}
			sliderToPara(objDragging, sliderPercent);
			changePara();
		} else if (sliderIsDragging == 3) {
			e.preventDefault();
			var offsetX = parseInt(e.pageX || e.touches[0].pageX) - document.getElementById(objDragging + "-div").parentElement.offsetLeft;
			if (offsetX < 316) {
				eval("vue_global.data." + objDragging + " = 0;");		// 更改 vue 中的属性值不能用 window，似乎 vue_global.data.data 不是亲儿子
			} else {
				eval("vue_global.data." + objDragging + " = 1;");
			}
			changePara();
		}
	}
	// 根据滑动条进度改变参数值
	// 对应反操作函数组 vue_computed_global
	function sliderToPara (sliderObj, sliderPercent) {
		switch (sliderObj) {
			case "video_detail_crf51":
				sliderPercent = Math.round(sliderPercent * 51) / 51;
				vue_global.data.video_detail.crf51 = 51 - Math.round(sliderPercent * 51)
				break;
			case "video_detail_crf63":
				sliderPercent = Math.round(sliderPercent * 63) / 63;
				vue_global.data.video_detail.crf63 = 63 - Math.round(sliderPercent * 63)
				break;
			case "video_detail_qp51":
				sliderPercent = Math.round(sliderPercent * 51) / 51;
				vue_global.data.video_detail.qp51 = 51 - Math.round(sliderPercent * 51)
				break;
			case "video_detail_qp70":
				sliderPercent = Math.round(sliderPercent * 70) / 70;
				vue_global.data.video_detail.qp70 = 70 - Math.round(sliderPercent * 70)
				break;
			case "video_detail_vbitrate":
				sliderPercent = approximation(sliderPercent,
								[0, 0.0833, 0.1667, 0.25, 0.3333, 0.4167, 0.5, 0.5833, 0.6667, 0.75, 0.8333, 0.9167, 1]);
							//	 64k  128k   256k   512k    1M      2M     4M    8M      16M    32M    64M   128M 256M
				vue_global.data.video_detail.vbitrate = Math.round(64 * Math.pow(2, sliderPercent * 12)) + " kbps";
				break;
			case "video_detail_q100":
				vue_global.data.video_detail.q100 = (sliderPercent * 100).toFixed(0);
				break;
			case "video_detail_preset_long":
				sliderPercent = Math.round(sliderPercent * 9) / 9;
				var video_preset_list = ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow", "placebo"];
				vue_global.data.video_detail.preset_long = video_preset_list[sliderPercent * 9];
				break;
			case "video_detail_preset_short":
				sliderPercent = Math.round(sliderPercent * 6) / 6;
				var video_preset_list = ["veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"];
				vue_global.data.video_detail.preset_short = video_preset_list[sliderPercent * 6];
				break;
			case "audio_bitrate":
				sliderPercent = approximation(sliderPercent,
								[0, 0.0975, 0.1667, 0.2642, 0.3333, 0.3870, 0.4308, 0.5, 0.5537, 0.5975, 0.6667, 0.7203, 0.7642, 0.8333, 0.8870, 0.9308, 1]);
							//	 8    12      16      24      32      40      48     64    80      96      128     160     192     256     320     384  512
				vue_global.data.audio_bitrate = Math.round(8 * Math.pow(2, sliderPercent * 6)) + " kbps";
				break;
			case "audio_vol":
				sliderPercent = Math.round(sliderPercent * 96) / 96;
				var temp = Math.round(sliderPercent * 96)
				if (temp > 48) {
					temp = "+" + (temp - 48) + " dB";
				} else {
					temp = (temp - 48) + " dB";
				}
				vue_global.data.audio_vol = temp;
				break;
		}
		/* touch-action: none */
		// document.getElementById(sliderObj + "-slipper").style.left = sliderPercent * 100 + "%";
		// document.getElementById(sliderObj + "-bg").style.width = sliderPercent * 100 + "%";
	}
	maincontent.onmouseup = maincontent.ontouchend = DragEnd;
	function DragEnd (e) {
		paraIsDragging = false;
		if (sliderIsDragging == 3) {
			if (Math.abs(mouseDownX - parseInt(e.pageX || e.touches[0].pageX)) <= 3) {
				if (document.getElementById(objDragging + "-slipper").style.left == "64px" && initLeft > 44) {
					eval("vue_global.data." + objDragging + " = 0;");
				} else if (document.getElementById(objDragging + "-slipper").style.left == "0px" && initLeft < 44) {
					eval("vue_global.data." + objDragging + " = 1;");
				}
				changePara();
			}
		}
		sliderIsDragging = false;
	}

	// 吸附功能
	function approximation (number, numList, threshould = 0.01) {
		for (const num of numList) {
			if (Math.abs(num - number) < threshould) {
				number = num;
			}
		}
		return number;
	}

/* #endregion */



/* #region 文件拖放功能 */

	var tasklist = document.getElementById("tasklist");
	var taskArray = new Set();		// taskArray 按顺序添加，存放所有存在任务的 id
	var taskOrder = [];				// taskOrder 用于给任务排序，序号在前的放前面。存放内容为 id
	var taskCount = 0;				// 只加不减

	tasklist.ondragenter = tasklist.ondragover = function (event) {
		if (FFmpegInstalled) {
			// 重写 ondragover 和 ondragenter 使其可放置
			event.preventDefault();
			document.getElementById("dropfilesimage").setAttribute("src", "image/drop_files_ok.png");
		}
	};

	tasklist.ondragleave = function (event) {
		if (FFmpegInstalled) {
			event.preventDefault();
			document.getElementById("dropfilesimage").setAttribute("src", "image/drop_files.png");
		}
	};

	tasklist.ondrop = function (event) {
		event.preventDefault();		// 避免浏览器对数据的默认处理（drop 事件的默认行为是以链接形式打开）
		var dropfilesdiv = document.getElementById("dropfilesdiv");
		dropfilesdiv.style.display = "none";
		var tasklist_scroll = document.getElementById("tasklist-scroll");
		var dropCount = 0;			// 拖入文件延时
		for (const file of event.dataTransfer.files) {
			setTimeout(() => {
				// DOM 标签创建
				console.log(file.path);
				var newTask = document.createElement('div');
				newTask.className = "taskitem-large";
				newTask.id = "taskitem_" + ("000" + taskCount).slice(-4);
				var newInnerHTML = "";
				// 文件名、时间、缩略图、进度、仪表盘等非参数性数据由 jquery 更改；输出参数数据与新的 vue 对象绑定
				newInnerHTML += '<div class="taskitem-background-wrapper"><div class="taskitem-background">';
					newInnerHTML += '<div class="taskitem-background-white"></div>';
					newInnerHTML += '<div class="taskitem-background-progress progress-green" v-bind:style="\'width: \' + info.progress_smooth + \'%\'"></div>';
					newInnerHTML += '<div class="taskitem-previewbox"><img src="image/preview.png" /></div>';
					newInnerHTML += '<span class="taskitem-timing">{{ getTimeString }}</span>';
					newInnerHTML += '<span class="taskitem-filename">' + file.name + '</span>';
					newInnerHTML += '<div class="taskitem-info taskitem-infobefore">';
						newInnerHTML += '<div class="taskitem-img-format"></div><span class="taskitem-span-format">读取中</span>';
						newInnerHTML += '<div class="taskitem-img-vcodec"></div><span class="taskitem-span-vcodec">读取中</span>';
						newInnerHTML += '<div class="taskitem-img-acodec"></div><span class="taskitem-span-acodec">读取中</span>';
						newInnerHTML += '<div class="taskitem-img-size"></div><span class="taskitem-span-size taskitem-size-compact">读取中</span>';
						newInnerHTML += '<div class="taskitem-img-vratecontrol"></div><span class="taskitem-span-vratecontrol">读取中</span>';
						newInnerHTML += '<div class="taskitem-img-aratecontrol"></div><span class="taskitem-span-aratecontrol">读取中</span>';
					newInnerHTML += '</div>';
					newInnerHTML += '<div class="taskitem-rightarrow"></div>';
					newInnerHTML += '<div class="taskitem-info taskitem-infoafter">';
						newInnerHTML += '<div class="taskitem-img-format"></div><span class="taskitem-span-format">{{ data.format_format }}</span>';
						newInnerHTML += '<div class="taskitem-img-vcodec"></div><span class="taskitem-span-vcodec">{{ data.video_vcodec }}</span>';
						newInnerHTML += '<div class="taskitem-img-acodec"></div><span class="taskitem-span-acodec">{{ data.audio_acodec }}</span>';
						newInnerHTML += '<div class="taskitem-img-size"></div><span v-bind:class="data.video_resolution == \'不改变\' ? \'taskitem-span-size\' : \'taskitem-span-size taskitem-size-compact\'" v-html="video_resolution_htmlCP"></span>';
						newInnerHTML += '<div class="taskitem-img-vratecontrol"></div><span class="taskitem-span-vratecontrol">{{ video_ratenum }}</span>';
						newInnerHTML += '<div class="taskitem-img-aratecontrol"></div><span class="taskitem-span-aratecontrol">{{ data.audio_bitrate }}</span>';
					newInnerHTML += '</div>';
					newInnerHTML += '<div class="taskitem-graphs">';
						newInnerHTML += '<div class="taskitem-graph">';
							newInnerHTML += '<div class="taskitem-graph-ring" v-bind:style="dashboard_bitrate"></div><span class="taskitem-graph-data" v-html="info.currentBitrate_smooth.toFixed(2) + \' M\'"></span><span class="taskitem-graph-description">码率</span>';
						newInnerHTML += '</div>';
						newInnerHTML += '<div class="taskitem-graph">';
							newInnerHTML += '<div class="taskitem-graph-ring" v-bind:style="dashboard_speed"></div><span class="taskitem-graph-data" v-html="info.currentSpeed_smooth.toFixed(2) + \' ×\'"></span><span class="taskitem-graph-description">速度</span>';
						newInnerHTML += '</div>';
						newInnerHTML += '<div class="taskitem-graph">';
							newInnerHTML += '<div class="taskitem-graph-ring" v-bind:style="dashboard_time"></div><span class="taskitem-graph-data" v-html="info.currentTime_smooth.toFixed(2)"></span><span class="taskitem-graph-description">时间</span>';
							newInnerHTML += '</div>';
							newInnerHTML += '<div class="taskitem-graph">';
							newInnerHTML += '<div class="taskitem-graph-ring" v-bind:style="dashboard_frame"></div><span class="taskitem-graph-data" v-html="info.currentFrame_smooth.toFixed(1)"></span><span class="taskitem-graph-description">帧</span>';
						newInnerHTML += '</div>';
					newInnerHTML += '</div>';
					newInnerHTML += '<div class="taskitem-delete" onclick="pauseNremove(' + taskCount +');"></div>';
				newInnerHTML += '</div></div>';
				newTask.innerHTML = newInnerHTML;
				tasklist_scroll.appendChild(newTask);
				// tasklist.append(newTask);
				
				var newTask = document.getElementById("taskitem_" + ("000" + taskCount).slice(-4));
				// newTask.addEventListener("click", () => {itemSelect(taskCount);})	// 如果使用 addEventListener，则后面的 vue 会把它覆盖掉
				newTask.setAttribute("onclick", "itemSelect(" + taskCount + ")");

				// vue 对象创建
				var newVue_name = "vue_taskitem_" + ("000" + taskCount).slice(-4);
				var newVue_options = {
					el: "#taskitem_" + ("000" + taskCount).slice(-4),
					data: {
						data: JSON.parse(JSON.stringify(vue_global.data)),
						info: {
							path: file.path,
							filename: file.name,	// 未来可供用户更改输出文件名
							errorInfo: [],			// 错误列表
							status: 0,				// -1：正在切换状态　0：停止　1：运行　2：暂停　3：完成（停止但计入总进度）
							difficulty: -1,			// 用于估计任务需花多少时间
							duration: 0,
							fps: "-",
							progress: 0,
							currentBitrate: 0,
							currentSpeed: 0,
							currentTime: 0,
							currentFrame: 0,
							progress_smooth: 0,
							currentBitrate_smooth: 0,
							currentSpeed_smooth: 0,
							currentTime_smooth: 0,
							currentFrame_smooth: 0,
						}
					},
					computed: vue_computed_global
				}
				eval(newVue_name + " = new Vue(newVue_options)"); // 这里是新建 vue 对象。不加 var 可以在全局域中声明，否则离开了函数变量就消失

				// FFmpeg 读取媒体信息
				var ffmpeg = new FFmpeg(2, ["-hide_banner", "-i", file.path, "-f", "null"])
				var currentTaskCount = taskCount;
				ffmpeg.on("metadata", ([format_display, duration, video_vcodec, video_resolution, video_bitrate, video_fps, audio_acodec, audio_bitrate]) => {
					$("#" + newTask.id + " .taskitem-infobefore .taskitem-span-format").html(format_display);
					window[newVue_name].info.duration = getTimeValue(duration);
					$("#" + newTask.id + " .taskitem-infobefore .taskitem-span-vcodec").html(video_vcodec == undefined ? "-" : video_vcodec);
					$("#" + newTask.id + " .taskitem-infobefore .taskitem-span-size").html(video_vcodec == undefined ? "-" : video_resolution.replace("x", "<br />"));
					$("#" + newTask.id + " .taskitem-infobefore .taskitem-span-vratecontrol").html(video_bitrate == undefined ? "-" : getFormattedBitrate(video_bitrate));
					window[newVue_name].info.fps = video_fps == undefined ? "-" : video_fps;
					$("#" + newTask.id + " .taskitem-infobefore .taskitem-span-acodec").html(audio_acodec == undefined ? "-" : audio_acodec);
					$("#" + newTask.id + " .taskitem-infobefore .taskitem-span-aratecontrol").html(audio_bitrate == undefined ? "-" : audio_bitrate + " kbps");	

					// 更新总体进度条
					overallProgressTimer();
				})
				ffmpeg.on("critical", (message) => {
					pushMsg(file.path + "：" + message, 2);
					setTimeout(() => {
						pauseNremove(currentTaskCount);
					}, 100);
				})
				ffmpeg.on("data", (data) => {
					commandwin_output.innerHTML += data + "\n";
					commandwin_output.scrollTop = commandwin_output.scrollHeight - commandwin_output.offsetHeight;
				});
				
				taskOrder.push(taskCount);		// 将自己的 id 号加到队尾
				taskArray.add(taskCount);
				itemSelect(taskCount);

				taskCount++;
				tasklist.scrollTop = tasklist.scrollHeight - tasklist.offsetHeight;
			}, dropCount);
			dropCount += 100;
		}
		setTimeout(() => {
			dropfilesdiv.remove();
			dropfilesdiv.style.display = "";
			dropfilesdiv.innerHTML = "<img id=\"dropfilesimage\" src=\"image/drop_files.png\" onclick=\"debugLauncher();\" draggable=\"false\" />"
			tasklist_scroll.append(dropfilesdiv);
			document.getElementById("dropfilesimage").setAttribute("src", "image/drop_files.png");
			itemSelectionStyleCalc();
		}, 1 + 100 * event.dataTransfer.files.length);
	}

/* #endregion */



/* #region 任务选取功能和任务列表高度计算 */

	var itemsSelected = new Set();				// ！更改为选中的 taskOrder index，而不是 taskitem id！
	var itemSelected_last = -1;
	var titlebar = document.getElementById("titlebar");
	var progressbar = document.getElementById("titlebar-background");
	function itemSelect (id) {
		// 将 taskitem id 转换为 taskOrder index
		var index = 0;
		for (const item of taskOrder) {			// 如果在 taskOrder 里找到这个 id 了，就 break 得到它现在在 taskOrder 里的位置
			if (item == id) {
				break;
			}
			index++;
		}
		if (keyShift == true) {
			if (itemSelected_last != -1) {		// 之前没选东西，现在选一堆
				itemsSelected.clear;
				var minIndex = Math.min(itemSelected_last, index);
				var maxIndex = Math.max(itemSelected_last, index);
				for (var i = minIndex; i <= maxIndex; i++) {
					if (taskArray.has(id)) {	// 如果任务未被删除
						itemsSelected.add(i);
					}
				}
			} else {							// 之前没选东西，现在选第一个
				itemsSelected.clear();
				itemsSelected.add(index);
			}
		} else if (keyCtrl == true) {
			if (itemsSelected.has(index)) {
				itemsSelected.delete(index);
			} else {
				itemsSelected.add(index);
			}
		} else {
			itemsSelected.clear();
			itemsSelected.add(index);
		}
		itemSelected_last = index;
		itemSelectionStyleCalc();
		if (event != undefined) {
			event.stopPropagation();
		}

		// 更新命令行预览
		var commandwin_current = document.getElementById("commandwin-current");
		// document.getElementById("commandwin-current-title").innerHTML = "当前文件指令（" + $("#taskitem_" + ("000" + index).slice(-4) + " .taskitem-filename").html() + "）";
		document.getElementById("commandwin-current-title").innerHTML = "当前文件指令（" + window["vue_taskitem_" + ("000" + taskOrder[index]).slice(-4)].info.path + "）";;

		commandwin_current.innerHTML = "ffmpeg";
		for (const arrayItem of getFFmpegParaArray(taskOrder[index])) {
			commandwin_current.innerHTML += " " + arrayItem;
		}

		// 将单个项目参数同步到全局参数
		vue_global.data = window["vue_taskitem_" + ("000" + taskOrder[index]).slice(-4)].data;
		calcParaDetail();
		paraPreview();
	}
	function itemUnselect () {
		itemsSelected.clear();
		itemSelected_last = -1;
		document.getElementById("commandwin-current-title").innerHTML = "当前文件指令（未选择文件）";
		document.getElementById("commandwin-current").innerHTML = "";
		itemSelectionStyleCalc();
	}
	function itemSelectionStyleCalc (dropfilesdivOnly = false) {
		if (dropfilesdivOnly) {								// 不重算列表高度，加快计算速度
			var currentListHeight = document.getElementById("tasklist-scroll").offsetHeight;
		} else {
			var currentListHeight = 0;
			var currentIndex = 0;
			for (const task of taskOrder) {
				var taskitem = document.getElementById("taskitem_" + ("000" + task).slice(-4));
				taskitem.style.top = currentListHeight + "px";
				if (itemsSelected.has(currentIndex)) {		// 选中
					switch (taskitem.className) {
						case "taskitem-small": taskitem.className = "taskitem-large"; break;
						case "taskitem-small-run": taskitem.className = "taskitem-large-run"; break;
					}
					currentListHeight += 80;
				} else {									// 没选中
					switch (taskitem.className) {
						case "taskitem-large": taskitem.className = "taskitem-small"; break;
						case "taskitem-large-run": taskitem.className = "taskitem-small-run"; break;
					}
					currentListHeight += 60;
				}
				currentIndex++;
			}
			document.getElementById("tasklist-scroll").style.height = currentListHeight + "px";
		}
		document.getElementById("dropfilesdiv").style.height = document.getElementById("tasklist").offsetHeight - currentListHeight - 16  + "px";
		document.getElementById("dropfilesdiv").style.top = currentListHeight + 8 + "px";
		
		// 命令行界面部分
		var commandwin = document.getElementById("commandwin");
		var finalHeight = document.getElementById("listview").offsetHeight;
		if (finalHeight >= 400) {
			commandwin.className = "commandwin-normal";
		} else if (finalHeight >= 280) {
			commandwin.className = "commandwin-small";
		} else {
			commandwin.className = "commandwin-mini";
		}	
	}
	itemSelectionStyleCalc(true);
		
	var keyShift = false;
	var keyCtrl = false;
	document.addEventListener("keydown", (event) => {
		keyShift = event.shiftKey;
		keyCtrl = event.ctrlKey;
	})
	document.addEventListener("keyup", (event) => {
		keyShift = event.shiftKey;
		keyCtrl = event.ctrlKey;
	})

/* #endregion */



/* #region 命令行参数列表计算 */

	// 将参数列表输出到参数预览，注意不是所有参数都要显示；指令列表里也在这里更新
	// TODO
	function paraPreview () {
		// 参数预览更新
		var para_preview_text = document.getElementById("para_preview-text");
		var newInnerHTML = "";
		newInnerHTML += "<p>"
		newInnerHTML += "容器/格式：" + vue_global.data.format_format;
		newInnerHTML += "　元数据前移：" + (vue_global.data.format_moveflags == 0 ? "否" : "是");
		newInnerHTML += vue_global.data.format_hwaccel == "不使用" ? "" : "　硬件解码：" + vue_global.data.format_hwaccel;
		newInnerHTML += "</p>";
		newInnerHTML += "<p>"
		newInnerHTML += "视频编码：" + vue_global.data.video_vcodec;
		if (vue_global.data.video_vcodec != "不重新编码") {
			newInnerHTML += vue_global.data.video_hwencode == "不使用" ? "" : "　硬件编码：" + vue_global.data.video_hwencode;
			newInnerHTML += vue_global.data.video_resolution == "不改变" ? "" : "　分辨率：" + vue_global.data.video_resolution;
			newInnerHTML += vue_global.data.video_fps == "不改变" ? "" : "　帧速：" + vue_global.data.video_fps;
			
			// for (const item of paralist_video_detail[vue_global.data.video_vencoder]) {

			// }
			
		}
		newInnerHTML += "</p>";
		if (vue_global.data.audio_enable == 1) {
			newInnerHTML += "<p>"
			newInnerHTML += "音频编码：" + vue_global.data.audio_acodec;
			if (vue_global.data.audio_acodec != "不重新编码") {
				newInnerHTML += "　码率：" + vue_global.data.audio_bitrate;
				newInnerHTML += "　音量：" + vue_global.data.audio_vol;	
			}	
			newInnerHTML += "</p>";	
		}
		para_preview_text.innerHTML = newInnerHTML;
		
		// 全局指令更新
		var commandwin_global = document.getElementById("commandwin-global");

		commandwin_global.innerHTML = "ffmpeg";
		for (const arrayItem of getFFmpegParaArray()) {
			commandwin_global.innerHTML += " " + arrayItem;			
		}

		// 文件指令更新
		if (itemSelected_last != -1) {
			var id = taskOrder[itemSelected_last];
			var commandwin_current = document.getElementById("commandwin-current");
			// document.getElementById("commandwin-current-title").innerHTML = "当前文件指令（" + $("#taskitem_" + ("000" + id).slice(-4) + " .taskitem-filename").html() + "）";
			document.getElementById("commandwin-current-title").innerHTML = "当前文件指令（" + window["vue_taskitem_" + ("000" + id).slice(-4)].info.path + "）";
	
			commandwin_current.innerHTML = "ffmpeg";
			for (const arrayItem of getFFmpegParaArray(id)) {
				commandwin_current.innerHTML += " " + arrayItem;
			}	
		}
		
	}
	// 根据 vue 中的数据获取 FFmpeg 启动参数数组
	function getFFmpegParaArray (index = -1, withQuotes = true) {
		var vueData = index == -1 ? vue_global.data : window["vue_taskitem_" + ("000" + index).slice(-4)].data;
		var paraArray = [];
		// hide_banner
		paraArray.push("-hide_banner");
		// 硬件解码加速
		if (vueData.format_hwaccel != "不使用") {
			paraArray.push("-hwaccel");
			paraArray.push(vueData.format_hwaccel);
		}
		// 文件名
		paraArray.push("-i");
		if (index == -1) {
			paraArray.push("(input_filename)")
		} else {
			if (withQuotes) {
				paraArray.push("\"" + window["vue_taskitem_" + ("000" + index).slice(-4)].info.path + "\"");
			} else {
				paraArray.push(window["vue_taskitem_" + ("000" + index).slice(-4)].info.path);
			}
		}
		// moveflags
		if (vueData.format_moveflags == 1) {
			paraArray.push("-movflags");
			paraArray.push("faststart");
		}

		// 视频编码（与硬件编码）
		paraArray.push("-vcodec");
		if (vueData.video_vcodec != "不重新编码") {
			if (vueData.video_vencoder == "") {
				vueData.video_vencoder = getVideoEncoder(vueData.video_vcodec, vueData.video_hwencode);
			};
			paraArray.push(vueData.video_vencoder);
			if (vueData.video_vencoder == "av1") {	// av1 特殊设定
				paraArray.push("-strict");
				paraArray.push("-2");
			}
			// 分辨率
			if (vueData.video_resolution != "不改变") {
				paraArray.push("-s");
				paraArray.push(vueData.video_resolution);
			}
			// 输出帧速
			if (vueData.video_fps != "不改变") {
				paraArray.push("-r");
				paraArray.push(vueData.video_fps);
			}

			// 像素格式
			if (vueData.video_detail.pixelfmt != "自动") {
				paraArray.push("-pix_fmt");
				paraArray.push(vueData.video_detail.pixelfmt);
			}
			// 码率模式，有的编码器没有 ratecontrol，这里不列，自然会进不了任何一个 case
			switch (vueData.video_detail.ratecontrol) {
				case "CRF":
					switch (vueData.video_vencoder) {
						case "crf": case "h264": case "hevc": case "av1": case "vp9": case "vp8":
							paraArray.push("-crf");
							paraArray.push(vueData.video_detail.crf51);
							break;
						case "vp9": case "vp8":
							paraArray.push("-crf");
							paraArray.push(vueData.video_detail.crf63);
							break;
						case "h264_nvenc": case "hevc_nvenc":
							paraArray.push("-cq");
							paraArray.push(vueData.video_detail.crf51);
							break;
					}
					break;
				case "CQP":
					switch (vueData.video_vencoder) {
						case "h264":
							paraArray.push("-qp");
							paraArray.push(vueData.video_detail.qp70);
							break;
						case "h264_nvenc": case "hevc_nvenc":
							paraArray.push("-qp");
							paraArray.push(vueData.video_detail.qp51);
							break;
						case "h264_amf":
							paraArray.push("-qp_i");
							paraArray.push(vueData.video_detail.qp51);
							paraArray.push("-qp_p");
							paraArray.push(vueData.video_detail.qp51);
							paraArray.push("-qp_b");
							paraArray.push(vueData.video_detail.qp51);
							break;
						case "h264_qsv": case "hevc_qsv":
							paraArray.push("-q");
							paraArray.push(vueData.video_detail.qp51);
						case "hevc_amf":
							paraArray.push("-qp_i");
							paraArray.push(vueData.video_detail.qp51);
							paraArray.push("-qp_p");
							paraArray.push(vueData.video_detail.qp51);
							break;
						}
					break;
				case "ABR":
					switch (vueData.video_vencoder) {
						case "av1": case "h264": case "h264_nvenc": case "h264_qsv": case "hevc": case "hevc_amf": case "hevc_nvenc": case "hevc_qsv": case "vp9": case "vp8": case "h263p": case "h261": case "mpeg4": case "mpeg2video": case "mpeg2_qsv": case "mpeg1video": case "mjpeg": case "mjpeg_qsv": case "wmv2": case "wmv1": case "rv20": case "rv10":
							paraArray.push("-b:v");
							paraArray.push(parseInt(vueData.video_detail.vbitrate) + "k");
							break;
					}
					break;
				case "CBR":
					switch (vueData.video_vencoder) {
						case "h264":
							paraArray.push("-b:v");
							paraArray.push(parseInt(vueData.video_detail.vbitrate) + "k");
							paraArray.push("-minrate");
							paraArray.push(parseInt(vueData.video_detail.vbitrate) + "k");
							paraArray.push("-maxrate");
							paraArray.push(parseInt(vueData.video_detail.vbitrate) + "k");
							break;
						case "h264_amf": case "hevc_amf":
							paraArray.push("-rc");
							paraArray.push("cbr");
							paraArray.push("-b:v");
							paraArray.push(parseInt(vueData.video_detail.vbitrate) + "k");
							break;
						case "h264_nvenc": case "hevc_nvenc":
							paraArray.push("-cbr");
							paraArray.push("true");
							paraArray.push("-b:v");
							paraArray.push(parseInt(vueData.video_detail.vbitrate) + "k");
							break;
						}
					break;
				case "Q":
					switch (vueData.video_vencoder) {
						case "h263p": case "mpeg4": case "mjpeg": case "rv20": case "rv10": case "wmv2": case "wmv1": 
							paraArray.push("-q:v");
							paraArray.push(parseInt(vueData.video_detail.q100));
							break;		
					}
			}

			// ————————————除了 ratecontrol、crf 等的细项————————————
			for (const item of paralist_video_detail[vueData.video_vencoder]) {
				switch (item.name) {
					case "ratecontrol": case "crf51": case "qp51": case "crf63": case "qp70": case "q100": case "vbitrate": case "pixelfmt":
						break;
					case "preset_long":
						paraArray.push("-preset");
						paraArray.push(vueData.video_detail.preset_long);
						break;
					case "preset_short":
						paraArray.push("-preset");
						paraArray.push(vueData.video_detail.preset_short);
						break;
					default: 
						if (vueData.video_detail[item.name] != "自动" && vueData.video_detail[item.name] != "普通") {
							paraArray.push("-" + item.name);
							paraArray.push(vueData.video_detail[item.name]);	
						}
				}
			}
		} else {
			paraArray.push("copy");
		}

		// 音频
		if (vueData.audio_enable) {
			paraArray.push("-acodec");
			if (vueData.audio_acodec != "不重新编码") {
				switch (vueData.audio_acodec) {
					case "OPUS": paraArray.push("opus"); break;
					case "AAC": paraArray.push("aac"); break;
					case "Vorbis": paraArray.push("vorbis"); break;
					case "MP3": paraArray.push("mp3"); break;
					case "MP2": paraArray.push("mp2"); break;
					case "MP1": paraArray.push("mp1"); break;
					case "AC3": paraArray.push("ac3"); break;
					case "FLAC": paraArray.push("flac"); break;
					case "ALAC": paraArray.push("alac"); break;
					case "WMA V2": paraArray.push("wmav2"); break;
					case "WMA V1": paraArray.push("wmav1"); break;
					case "DTS": paraArray.push("dts"); paraArray.push("-strict"); paraArray.push("-2"); break;
					case "AMR WB": paraArray.push("amr_wb"); break;
					case "AMR NB": paraArray.push("amr_nb"); break;
				}
				if (vueData.audio_acodec == "FLAC" || vueData.audio_acodec == "OPUS") {		// FFmpeg 实验性功能
					paraArray.push("-strict");
					paraArray.push("-2");
				}
					paraArray.push("-b:a");
				paraArray.push(parseInt(vueData.audio_bitrate) + "k");
				if (vueData.audio_vol != "0 dB") {
					paraArray.push("-vol");
					var audio_vol_db = parseInt(vueData.audio_vol.slice(0, vueData.audio_vol.indexOf(" ")));
					paraArray.push(Math.round(256 * Math.pow(10, (audio_vol_db) / 20)));
				}	
			} else {
				paraArray.push("copy");
			}
		} else {
			paraArray.push("-an");
		}
							/* 调试用↓ */
							// paraArray.push("-threads");
							// paraArray.push("1");
							/* 调试用↑ */
		if (index == -1) {
			paraArray.push("(output_filename)." + vueData.format_format.toLowerCase())
		} else {
			if (withQuotes) {
				paraArray.push(getFilePathWithoutPostfix("\"" + window["vue_taskitem_" + ("000" + index).slice(-4)].info.path) + "_converted." + vueData.format_format.toLowerCase() + "\"");
			} else {
				paraArray.push(getFilePathWithoutPostfix(window["vue_taskitem_" + ("000" + index).slice(-4)].info.path) + "_converted." + vueData.format_format.toLowerCase());
			}
			
			// paraArray.push($("#vue_taskitem_" + ("000" + index).slice(-4) + " .taskitem-filename").html());
		}
		paraArray.push("-y");
		return paraArray;
	}
	// 根据编码方式与硬件编码的组合确定编码器
	function getVideoEncoder (vcodec, hwencode) {
		switch (vcodec) {
			case "不重新编码": return "copy"; break;
			case "AV1": return "av1"; break;
			case "HEVC":
				switch (hwencode) {
					case "AMD AMF": return "hevc_amf"; break;
					case "Intel QSV": return "hevc_qsv"; break;
					case "NVIDIA NVENC": return "hevc_nvenc"; break;
					case "不使用": default: return "hevc"; break;
				}
				break;
			case "H.264": 
				switch (hwencode) {
					case "AMD AMF": return "h264_amf"; break;
					case "Intel QSV": return "h264_qsv"; break;
					case "NVIDIA NVENC": return "h264_nvenc"; break;
					case "不使用": default: return "h264"; break;
				}
				break;
			case "H.263": return "h263p"; break;
			case "H.261": return "h261"; break;
			case "VP9": return "vp9"; break;
			case "VP8": return "vp8"; break;
			case "MPEG-4": return "mpeg4"; break;
			case "MPEG-2": 
				switch (hwencode) {
					case "Intel QSV": return "mpeg2_qsv"; break;
					case "不使用": default: return "mpeg2video"; break;
				}
				break;
			case "MPEG-1": return "mpeg1video"; break;
			case "MJPEG": 
				switch (hwencode) {
					case "Intel QSV": return "mjpeg_qsv"; break;
					case "不使用": default: return "mjpeg"; break;
				}
				break;
			case "WMV2": return "wmv2"; break;
			case "WMV1": return "wmv1"; break;
			case "RV20": return "rv20"; break;
			case "RV10": return "rv10"; break;

			default: return undefined;
		}
	}
	function getFilePathWithoutPostfix (path) {
		var lastSlash = path.lastIndexOf(".");
		if (lastSlash != -1) {							// 路径名有点
			if (lastSlash > path.lastIndexOf("\\")) {	// 文件名有点
				return path.slice(0, lastSlash);
			} else {
				return path;							// 路径有点，但不在文件名里
			}
		} else {										// 路径名里一个点也没有，全数返回
			return path;
		}
	}

/* #endregion */



/* #region 配置存取、任务参数更新、命令行参数列表计算 */

	function saveDefaultPara () {
		// format
		store.set("format", {
			format: 'MP4',
			moveflags: 0,
			hwaccel: "不使用"
		});
		store.set("video", {
			vcodec: '不重新编码',
			hwencode: '不使用',
			resolution: '不改变',
			fps: '不改变',
			// 以下依据视频编码器自动选择是否显示
			detail: {
				preset_long: "medium",
				preset_short: "medium",
				preset: "自动",
				tune: "普通",
				profile: '自动',
				level: '自动',
				quality: "balanced",
				ratecontrol: 'CRF',
				crf51: "24",
				crf63: "24",
				qp51: "24",
				qp70: "24",
				q100: "50",
				vbitrate: "4 Mbps",
				pixelfmt: '自动'	
			}
		});
		store.set("audio", {
			enable: 1,
			acodec: '不重新编码',
			bitrate: "256 kbps",
			vol: "0 dB"
		})
	}
	var saveAllParaTimer;
	function changePara () {			// 延后存盘、更新到任务项参数、更新到配置预览窗格
		clearTimeout(saveAllParaTimer)
		saveAllParaTimer = setTimeout(() => {
			saveParaToDisk();
		}, 700);
		for (const itemSelected of itemsSelected) {
			eval("vue_taskitem_" + ("000" + taskOrder[itemSelected]).slice(-4) + ".data = JSON.parse(JSON.stringify(vue_global.data));")
		}
		paraPreview();					// 这句要在上面 for 之后，因为上面的 for 用于同步全局与单个文件
	}
	function saveParaToDisk () {		// combobox 和 slider 均存储 text 中的数值，switch 存储 0 或 1
		store.set("format", {
			format: vue_global.data.format_format,
			moveflags: vue_global.data.format_moveflags,
			hwaccel: vue_global.data.format_hwaccel,
		});
		store.set("video", {
			vcodec: vue_global.data.video_vcodec,
			hwencode: vue_global.data.video_hwencode,
			resolution: vue_global.data.video_resolution,
			fps: vue_global.data.video_fps,
			// 以下依据视频编码器自动选择是否显示
				detail: vue_global.data.video_detail,
		});
		store.set("audio", {
			enable: vue_global.data.audio_enable,
			acodec: vue_global.data.audio_acodec,
			bitrate: vue_global.data.audio_bitrate,
			vol: vue_global.data.audio_vol,
		})
		console.log("参数已保存");
	}
	function readParaFromDisk () {
		// store.openInEditor();
		if (!store.has("ffbox.version") || store.get("ffbox.version") > 1) {		// 第一个条件成立就不会触发第二个判断
			store.set("ffbox.version", versionNumber);
			saveDefaultPara();
		}
		var format = store.get("format");
		var video = store.get("video");
		var audio = store.get("audio");
		// 格式
		vue_global.data.format_format = format.format;
		vue_global.data.format_moveflags = format.moveflags;
		vue_global.data.format_hwaccel = format.hwaccel;
		// 视频
		vue_global.data.video_vcodec = video.vcodec;
		vue_global.data.video_hwencode = video.hwencode;
		vue_global.data.video_resolution = video.resolution;
		vue_global.data.video_fps = video.fps;
		// 以下依据视频编码器自动选择是否显示
			vue_global.data.video_detail = video.detail
		// 音频
		vue_global.data.audio_enable = audio.enable;
		vue_global.data.audio_acodec = audio.acodec;
		vue_global.data.audio_bitrate = audio.bitrate;
		vue_global.data.audio_vol = audio.vol;
		paraPreview();
	}
	function clearAllPara () {
		store.clear();
	}
	readParaFromDisk();

/* #endregion */



/* #region 弹出菜单处理 */

	function getWindowOffsetLeft(obj) {
		var realNum = obj.offsetLeft;
		var positionParent = obj.offsetParent;  // 获取上一级定位元素对象
		
		while(positionParent != null) {
			realNum += positionParent.offsetLeft;
			positionParent = positionParent.offsetParent;
		}
		return realNum;
	}
	function getWindowOffsetTop(obj) {
		var realNum = obj.offsetTop;
		var positionParent = obj.offsetParent;  // 获取上一级定位元素对象
		
		while(positionParent != null) {
			realNum += positionParent.offsetTop - positionParent.scrollTop;
			positionParent = positionParent.offsetParent;
		}
		return realNum;
	}
	
	function popupMenu (paraname) {
		// 计算列表内容
		var popmenulist = document.getElementById("popupmenu-list");
		popmenulist.innerHTML = "";
		var comboItemCount = 0;
		var toIterate;
		if (paraname.indexOf("video_detail_") != -1) {					// 点击的不是编码器，直接读取当前编码器的参数列表
			for (const key in paralist_video_detail[vue_global.data.video_vencoder]) {
				var para = paralist_video_detail[vue_global.data.video_vencoder][key];
				if (para.name == paraname.slice(13)) {
					toIterate = para.items;
				}
			}
		} else if (paraname.indexOf("audio_detail_") != -1) {			// 音频也是如此
			// TODO
		} else {														// 更改的是编码器、分辨率、帧速等非详细参数
			toIterate = window["paralist_" + paraname];
		}
		for (const paraitem of toIterate) {
			popmenulist.innerHTML += "<div id=\"popupmenu-item-" + paraname + "-" + comboItemCount + "\" class=\"popupmenu-item\" onclick=\"popupMenuClick('" + paraname + "'," + comboItemCount + ")\" onmouseenter=\"popupMenuHover('" + paraname + "'," + comboItemCount + ");\" onmouseleave=\"popupMenuLeave();\"><div style=\"background-image: url(image/formats/" + paraitem[2] + ".png); background-position-x: " + paraitem[3] * -20 + "px;\"></div>" + paraitem[1] + "</div>\n";
			comboItemCount++;
		}

		// 列表内容筛选
		var toRemove = [];
		if (paraname == "video_hwencode") {		// 视频编码筛选硬件编码器
			if (vue_global.data.video_vcodec == "HEVC") {
				toRemove = [8, 7, 3, 2, 1];
			} else if (vue_global.data.video_vcodec == "H.264") {
				toRemove = [8, 7, 6, 5, 4];
			} else if (vue_global.data.video_vcodec == "MJPEG") {
				toRemove = [8, 6, 5, 4, 3, 2, 1];
			} else if (vue_global.data.video_vcodec == "MPEG-2") {
				toRemove = [7, 6, 5, 4, 3, 2, 1];
			} else {
				toRemove = [8, 7, 6, 5, 4, 3, 2, 1];
			}
		}
		for (const removeNum of toRemove) {
			popmenulist.children[removeNum].remove();
			comboItemCount--;
		}

		// 计算列表位置和说明上下位置
	
	var combobox = document.getElementById(paraname + "-div");
		var popDescription = document.getElementById('popupmenu-description');
		var popLeft = getWindowOffsetLeft(combobox) - 39;
		popmenulist.style.left = popLeft + "px";
		// var currentHeight = window.getComputedStyle(popmenulist).height;
		var currentHeight = 40 * comboItemCount;
		if (currentHeight > ScreenHeight - 28) {						// 列表总高度比窗口高度还大（标题栏高度 28px）
			popmenulist.style.top = "28px";
			popmenulist.style.height = ScreenHeight - 28 + "px";
			popDescription.style.top = "calc(50% - 100px)";
		} else if (currentHeight > getWindowOffsetTop(combobox) - 28) {	// 列表总高度减去标题栏比 combobox 顶高度还大
			popmenulist.style.top = "28px";
			popmenulist.style.height = currentHeight + "px";
			popDescription.style.top = (currentHeight - 200) / 2 + "px";
		} else {														// 都不超，只按底部位置计算
			popmenulist.style.top = getWindowOffsetTop(combobox) - 24 - currentHeight + "px";
			popmenulist.style.height = currentHeight + "px";
			popDescription.style.top = (getWindowOffsetTop(combobox) - 24 - currentHeight / 2 - 100) + "px";
		}

		// 计算说明左右位置
		if (popLeft + 210 + 312 > ScreenWidth) {
			popDescription.style.left = popLeft - 312 - 24 + "px";
		} else {
			popDescription.style.left = popLeft + 200 + 12 + "px";
		}
		document.getElementById('popupmenu').className='visible';
		document.getElementById("popupmenu").style.pointerEvents = "auto";
		var popup = setTimeout(() => {
			popmenulist.className = "popupmenu-list-open";
		}, 10);
		
	}
	function popdownMenu () {
		var popmenulist = document.getElementById("popupmenu-list");
		popmenulist.className = "popupmenu-list-fold";
		document.getElementById("popupmenu").style.pointerEvents = "none";
		var popdown = setTimeout(() => {
			if (popmenulist.className == "popupmenu-list-fold") {			// 如果关了马上又开了，那就不做这个操作
				document.getElementById('popupmenu').className='invisible';
			}
		}, 300);
	}

	// 选中菜单项
	function popupMenuClick (paraname, value) {
		if (paraname == "video_vcodec" || paraname == "video_hwencode") {	// 若更改编码器，则重新生成参数列表
			eval("vue_global.data." + paraname + " = \"" + window["paralist_" + paraname][value][0] + "\";");
			if (paraname == "video_vcodec") {
				vue_global.data.video_hwencode = "不使用";
			}
			calcParaDetail();
		}
		if (paraname.indexOf("video_detail_") != -1) {						// 更改的不是编码器，直接读取当前编码器的参数列表
			// 获取参数列表
			var combolist;
			for (const para of paralist_video_detail[vue_global.data.video_vencoder]) {
				if (para.name == paraname.slice(13)) {
					combolist = para.items;
				}
			}
			eval("vue_global.data.video_detail." + paraname.slice(13) + "= \"" + combolist[value][0] + "\";");
			if (paraname == "video_detail_ratecontrol") {
				calcParaDetail();
			}
		} else if (paraname.indexOf("audio_detail_") != -1) {				// 音频也是如此
			// TODO
		} else {															// 更改的是编码器、分辨率、帧速等非详细参数
			eval("vue_global.data." + paraname + " = \"" + window["paralist_" + paraname][value][0] + "\";");
		}
		popdownMenu();
		changePara();
	}

	function calcParaDetail () {
		// 清除旧参数项
		var parabox_2 = document.getElementById("parabox_2");		// 视频参数面板
		while (parabox_2.children.length > 4) {						// 使用 while 因为 remove 之后数组发生变化
			parabox_2.children[4].remove();
		}
		// var parabox_3 = document.getElementById("parabox_3");		// 音频参数面板

		// 新建参数项——视频
		var videoEncoder = getVideoEncoder(vue_global.data.video_vcodec, vue_global.data.video_hwencode);
		vue_global.data.video_vencoder = videoEncoder;
		if (videoEncoder != "copy") {
			for (const paraObject of paralist_video_detail[videoEncoder]) {
				var newEl = document.createElement("div");
				var newInnerHTML = "";
				if (paraObject.mode == "combo") {
					newEl.className = "combobox";
					newInnerHTML += '<div class="combobox-title">' + paraObject.display + '</div>';
					newInnerHTML += '<div class="combobox-selector" id="video_detail_' + paraObject.name + '-div" onclick="popupMenu(\'video_detail_' + paraObject.name + '\')">';
						if (paraObject.name == "ratecontrol") {
							var ifRateControl = paraObject.items.findIndex((value) => {
								if (vue_global.data.video_detail.ratecontrol == value[0]) return true;
							});
							if (ifRateControl == -1) {		// 当前编码器的码率控制列表里没有当前设置项，则把设置项设置为列表第一项
								vue_global.data.video_detail.ratecontrol = paraObject.items[0][0];
							}
						}
						newInnerHTML += '<span class="combobox-selector-text" id="video_detail_' + paraObject.name + '-text">{{ data.video_detail.' + paraObject.name + ' }}</span>';
						newInnerHTML += '<img class="combobox-selector-img" src="image/menu_button.svg" />';
					newInnerHTML += '</div>';
				} else if (paraObject.mode == "slider") {
					if ( (paraObject.name.indexOf("qp") != -1 && vue_global.data.video_detail.ratecontrol != "CQP")  ||		// 有 qp 的参数项但又没选 CQP 的模式
							(paraObject.name.indexOf("crf") != -1 && vue_global.data.video_detail.ratecontrol != "CRF")  ||	// 有 crf 的参数项但又没选 CRF 的模式
							(paraObject.name == "VBR" && vue_global.data.video_detail.ratecontrol != "VBR")  ||
							(paraObject.name == "q100" && vue_global.data.video_detail.ratecontrol != "Q")  ||
							(paraObject.name == "vbitrate" && (vue_global.data.video_detail.ratecontrol != "ABR" && vue_global.data.video_detail.ratecontrol != "CBR")) ) {
							continue;
					}
					newEl.className = "slider";
					newInnerHTML += '<div class="slider-title">' + paraObject.display + '</div>';
					newInnerHTML += '<div class="slider-module" id="video_detail_' + paraObject.name + '-module" onmousedown="sliderDragStart(event, this);" ondrag="console.log(event);">';
						newInnerHTML += '<div class="slider-module-track"></div>';
						newInnerHTML += '<div class="slider-module-track-background" id="video_detail_' + paraObject.name + '-bg" v-bind:style="\'width: \' + video_detail_' + paraObject.name + '_percent"></div>';
						for (const key in paraObject.tags) {
							newInnerHTML += '<span class="slider-module-mark" style="left: ' + key +'%;">' + paraObject.tags[key] + '</span>';
						}
						newInnerHTML += '<div class="slider-module-slipper" id="video_detail_' + paraObject.name + '-slipper" onmousedown="sliderDragStart(event, this);"  v-bind:style="\'left: \' + video_detail_' + paraObject.name + '_percent"></div>';
					newInnerHTML += '</div>';
					newInnerHTML += '<div class="slider-text" id="video_detail_' + paraObject.name + '-text">{{ data.video_detail.' + paraObject.name + ' }}</div>';
				}
				newEl.innerHTML = newInnerHTML;
				parabox_2.appendChild(newEl);
			}	
		}
		
		var newVue_data = JSON.parse(JSON.stringify(vue_global.data));
		vue_global.$destroy();
		vue_global = null;
		// 虽然是个比较笨的方法，但还是要重新关联 #parabox 里的东西
		document.getElementById("format_format-text").innerHTML = "{{ data.format_format }}";
		document.getElementById("format_moveflags-bg").setAttribute("v-bind:style", "data.format_moveflags == 0 ? 'width: 0%;' : 'width: 100%'");
		document.getElementById("format_moveflags-slipper").setAttribute("v-bind:style", "data.format_moveflags == 0 ? 'left: 0px;' : 'left: 64px'");
		document.getElementById("format_hwaccel-text").innerHTML = "{{ data.format_hwaccel }}";

		document.getElementById("video_vcodec-text").innerHTML = "{{ data.video_vcodec }}";
		document.getElementById("video_hwencode-text").innerHTML = "{{ data.video_hwencode }}";
		document.getElementById("video_resolution-text").innerHTML = "{{ data.video_resolution }}";
		document.getElementById("video_fps-text").innerHTML = "{{ data.video_fps }}";
		
		document.getElementById("audio_enable-bg").setAttribute("v-bind:style", "data.audio_enable == 0 ? 'width: 0%;' : 'width: 100%'");
		document.getElementById("audio_enable-slipper").setAttribute("v-bind:style", "data.audio_enable == 0 ? 'left: 0px;' : 'left: 64px'");
		document.getElementById("audio_acodec-text").innerHTML = "{{ data.audio_acodec }}";
		document.getElementById("audio_bitrate-bg").setAttribute("v-bind:style", "'width: ' + audio_bitrate_percent");
		document.getElementById("audio_bitrate-slipper").setAttribute("v-bind:style", "'left: ' + audio_bitrate_percent");
		document.getElementById("audio_bitrate-text").innerHTML = "{{ data.audio_bitrate }}";
		document.getElementById("audio_vol-bg").setAttribute("v-bind:style", "'width: ' + audio_vol_percent");
		document.getElementById("audio_vol-slipper").setAttribute("v-bind:style", "'left: ' + audio_vol_percent");
	
		document.getElementById("audio_vol-text").innerHTML = "{{ data.audio_vol }}";

		// document.getElementById("audio_reencode").setAttribute("v-show", "data.audio_enable == 1 && data.audio_acodec != '不重新编码'");

		var newVue = new Vue({
			el: '#parabox',
			data: {
				data: newVue_data,
			},
			computed: vue_computed_global
		})
		vue_global = newVue;
		var dragger = document.getElementById("parabox-dragger");
		dragger.onmousedown = dragger.ontouchstart = paraDragStart;
		
		// vue_global.$destroy();
		// vue_global.$mount('#parabox');

		// 新建参数项——音频
		// var audioEncoder = vue_global.audio_vcodec;
	}
	calcParaDetail();
	

	// 描述文本
	function popupMenuHover (paraname, value) {
		var popupmenu_description = document.getElementById("popupmenu-description");
		var popmenulist = document.getElementById("popupmenu-list");
		var detailList;
		if (paraname.indexOf("video_detail") != -1) {
			for (const paraItem of paralist_video_detail[vue_global.data.video_vencoder]) {
				if (paraItem.name == paraname.slice(13)) {
					detailList = paraItem.items;
				}
			}
		} else if (paraname.indexOf("audio_detail") != -1) {
			// TODO
		} else {
			detailList = window["paralist_" + paraname];
		}
		popupmenu_description.innerHTML = detailList[value][4];
		popupmenu_description.className = "popupmenu-description-open";
		// var newTop = popmenulist.offsetTop + 40 * value;
		var newTop = getWindowOffsetTop(document.getElementById("popupmenu-item-" + paraname + "-" + value))// - popmenulist.scrollTop;
		if (newTop + 224 > ScreenHeight) {
			popupmenu_description.style.top = ScreenHeight - 224 + "px";
		} else {
			popupmenu_description.style.top = newTop + "px";
		}
	}
	function popupMenuLeave () {
		var popupmenu_description = document.getElementById("popupmenu-description");
		popupmenu_description.className = "popupmenu-description-fold";
	}

/* #endregion */
