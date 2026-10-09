# 需请求 tts 的理由

适用版本：**0.1.3** · 源码核对日期：**2026-10-06**。

## 中文填写内容

```text
用户点击译文卡片的语音按钮后，用于将该条译文朗读出来。扩展只选择 Chrome 明确标识为本地（remote=false）的中文语音，所有目标语言统一使用（优先 zh-CN，其次其他中文语音），不改写译文，支持长文本分段、停止播放和多个界面的播放协调。不会自动朗读，不使用远程语音回退或云端语音 API，不访问麦克风，不保存音频；本功能不额外持久保存译文。没有可用的本地中文语音时，提示用户安装中文语音，不回退到非中文语音。
```

## English — 可直接粘贴到英文后台

```text
Read a translated result aloud only when the user clicks its speaker button. The extension uses a Chinese voice explicitly reported by Chrome as local (remote=false) for every target language, preferring zh-CN and otherwise another Chinese locale without rewriting the translated text, handles long text in chunks, and coordinates playback and stopping across its views. There is no automatic playback, remote-voice fallback, cloud speech API, microphone access, or stored audio. Translated text is passed to the selected local speech engine for playback and is not additionally persisted for this feature. If no local Chinese voice is available, the user is prompted to install one; no non-Chinese voice is used as a fallback.
```

## 提交前注意（不必复制到理由框）

朗读前的 AI 翻译仍需要请求用户配置的服务；“本地朗读”不等于“AI 翻译离线运行”。tts 是文字转语音，不是录音或语音识别权限。

## 对应实现

- `src/shared/speech.js`
- `src/shared/speech-client.js`
- `src/shared/translation-view.js`

[返回权限说明目录](README.md)
