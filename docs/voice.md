# StudyGPS study audio / 学习语音

StudyGPS includes four **pre-generated English** study prompts produced locally with Kyutai Pocket TTS. The Chinese interface provides a Chinese reading transcript alongside the English audio. This is not a realtime voice coach: it does not listen to learners, assess spoken answers, or generate speech from student profiles, scores, health scenarios, or teacher advice. No student data was sent to a speech provider.

StudyGPS 提供四段由 Kyutai Pocket TTS 在本机预生成的英文学习提示，并配有中文文字稿。它不录音、不评判口头答案，也不会根据个人档案实时生成语音。当前未提供 Pocket TTS 中文语音；新版上游支持的语言也不包含中文。界面中的设备朗读（如果使用）必须单独标明，不能标作 Pocket TTS。

## Content and attribution

The prompts are original adaptations of the public, illustrative practice sheets in `engine/examples/resources/`: first law, second law, entropy, and Rankine cycle. Each prompt has 45–70 English words and asks the learner to recall, solve, and check a small exercise. The material remains unreviewed prototype practice, not official course instruction or an instructor-approved assessment. Completing or hearing it does not establish mastery.

Audio files and bilingual transcripts are in `web/assets/audio/`. `manifest.json` records the topic, transcript, source-resource checksum, audio checksum, duration, generation parameters, and attribution. The website serves the audio as ordinary static files; model weights and Python dependencies are not deployed.

- Software: [Kyutai Pocket TTS](https://github.com/kyutai-labs/pocket-tts), distributed under its [MIT license](https://github.com/kyutai-labs/pocket-tts/blob/main/LICENSE).
- Model: Kyutai Pocket TTS English April 2026, [model card and CC BY 4.0 license](https://huggingface.co/kyutai/pocket-tts). The official [variant without voice cloning](https://huggingface.co/kyutai/pocket-tts-without-voice-cloning) is also CC BY 4.0; the package may load this public variant when full weights are unavailable. The actual loaded weight URL is recorded in each manifest entry.
- Official preset: `alba`, derived by Kyutai from **Alba MacKenna's Casual voice**, released under **CC BY 4.0**. See [Kyutai's voice-license statement](https://huggingface.co/kyutai/tts-voices#alba-mackenna), the [source voice files](https://huggingface.co/kyutai/tts-voices/tree/main/alba-mackenna), and the [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/). We use the official precomputed preset, with no personal voice recording or custom cloning.

Visible player attribution: **AI voice: Pocket TTS · Alba MacKenna · CC BY 4.0**. Link the voice name to its source and the license label to the license above. These are AI-generated adaptations of the supplied voice preset, not recordings by Alba MacKenna reading or endorsing StudyGPS material. Keep the attribution with redistributed audio and link to this provenance.

## Reproduce

Use a virtual environment and model cache **outside the repository**. The generator takes no arbitrary text or voice input. It loads only the four public prompts defined in the script and official `alba` preset. It publishes the manifest only after all four generated WAV files pass validation.

```sh
python3 -m venv ../work/pocket-tts/.venv
../work/pocket-tts/.venv/bin/python -m pip install 'pocket-tts==3.1.0'
HF_HOME="$(pwd)/../work/pocket-tts/hf-cache" \
  HF_HUB_DISABLE_IMPLICIT_TOKEN=1 HF_HUB_DISABLE_TELEMETRY=1 \
  ../work/pocket-tts/.venv/bin/python scripts/generate-tts.py
python3 scripts/generate-tts.py --verify
```

Run these commands from the StudyGPS repository. The first generation downloads official public model files. The verification command uses only Python's standard library and does not load a model or contact a network. If model files cannot be downloaded, generation fails; it does not replace Pocket TTS with another voice engine.

Generation settings:

| Setting | Value |
| --- | --- |
| Python package | `pocket-tts==3.1.0` |
| Built-in model configuration | `english_2026-04` |
| Official preset | `alba` |
| Execution | CPU, two PyTorch threads, no quantization |
| Temperature / sampler decode steps | `0.3` / `1` |
| EOS threshold / noise clamp | `-4.0` / none |
| Max tokens per chunk | `50`; Pocket TTS splits longer input |
| Frames after EOS | Package automatic setting |
| Random seeds | `20260913` through `20260916`, in topic order |
| Output | Mono 24 kHz, signed 16-bit PCM WAV |
| Postprocessing | PCM conversion; reduce peaks above 0.95, without boosting quiet audio |

The package configuration pins model and voice-embedding revisions; the exact URLs and runtime versions are written into the manifest. Fixed seeds improve repeatability but do not guarantee identical bytes across different hardware, PyTorch versions, or future changes to the generator. The committed checksums identify the shipped files.

## Shipped generation

Generated on 13 September 2026 using macOS arm64, Python 3.14.6 and PyTorch 2.14.0. The official loader selected the public **Pocket TTS variant without voice cloning**, model revision `d29db7978e464fb90cb3359ee0c69a273b9142cc`; the official Alba embedding is pinned to revision `e81d79e8194ad4c7ce879c87a4258ef20cbf2487`. This is real Pocket TTS inference using a preset, with no alternate speech provider.

| Topic | Audio | Duration | English words |
| --- | --- | ---: | ---: |
| First law | `first-law.wav` | 22.08 s | 67 |
| Second law | `second-law.wav` | 21.36 s | 65 |
| Entropy | `entropy.wav` | 23.36 s | 67 |
| Rankine cycle | `rankine-cycle.wav` | 23.76 s | 66 |

All four WAV checks and source/transcript/checksum checks passed. A separate PCM check found nonzero signal RMS of 0.108–0.119, peaks below 0.75, and zero clipped samples. These generation checks did not include a human listening review.

## Verification boundary

`python3 scripts/generate-tts.py --verify` checks four exact topics, source and transcript consistency, source-resource checksums, file checksums, WAV format, duration bounds, and nonzero audio. The generator additionally rejects nonfinite or effectively silent model output. These checks establish that real audio assets exist and match their generation records; they do not by themselves prove every spoken word is pronounced correctly. Browser playback and listening QA should be reported separately from model generation.
