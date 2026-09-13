#!/usr/bin/env python3
"""Generate StudyGPS's four public English study prompts with real Pocket TTS.

Install pocket-tts==3.1.0 in an external virtual environment; see docs/voice.md.
No student records, arbitrary prompts, recordings, or credentials are accepted.
"""

import argparse
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import shutil
import tempfile
import wave


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "web/assets/audio"
PACKAGE_VERSION = "3.1.0"
LANGUAGE = "english_2026-04"
VOICE = "alba"
SEED = 20260913
PROMPTS = {
    "first_law": {
        "file": "first-law.wav",
        "resource": "engine/examples/resources/first-law.md",
        "en": "Close your notes and recall the first law for a closed system. Ignore kinetic and potential energy changes. Say the sign convention aloud: heat entering is positive, and work leaving is positive. Now calculate the internal energy change when one hundred and twenty kilojoules enter as heat and forty-five leave as work. Check your units, then explain why work done on the system has a negative sign.",
        "zh": "先合上笔记，回忆封闭系统的第一定律，并忽略动能和势能变化。说出符号约定：流入的热量为正，系统对外做功为正。现在，系统吸收120千焦热量、对外做功45千焦，内能改变多少？检查单位，再解释为什么外界对系统做功时，功的符号为负。",
    },
    "second_law": {
        "file": "second-law.wav",
        "resource": "engine/examples/resources/second-law.md",
        "en": "Start with a blank page. Recall the reversible efficiency limit for a heat engine between two constant-temperature reservoirs. Use kelvin, not Celsius. For hot and cold reservoirs at six hundred and three hundred kelvin, calculate the limit. Then compare proposed efficiencies of forty and sixty percent. Explain which exceeds the limit, and why passing this check does not prove that an engine design will work.",
        "zh": "从一张白纸开始，回忆热机在两个恒温热源之间运行时的可逆效率上限。温度要用开尔文，不用摄氏度。高温和低温热源分别为600和300开尔文，效率上限是多少？再比较40%与60%两个方案。解释哪个超过上限，以及为什么通过这个检查仍不能证明热机设计可行。",
    },
    "entropy": {
        "file": "entropy.wav",
        "resource": "engine/examples/resources/entropy.md",
        "en": "Before using an entropy equation, name its conditions. In this practice example, heat transfer is reversible and temperature stays constant. Calculate the entropy change when six hundred joules enter at three hundred kelvin. Write the unit as joules per kelvin. Now reverse the heat flow and check the sign. Finally, explain why a system's entropy decrease alone tells you nothing conclusive about the total system and surroundings.",
        "zh": "用熵的公式前，先说清适用条件：这道练习的传热过程可逆，且温度保持不变。在300开尔文时吸收600焦耳热量，熵变化是多少？单位写成焦耳每开尔文。现在把热流方向反过来，检查符号。最后解释：为什么仅凭系统的熵减少，不能判断系统与环境的总熵变化。",
    },
    "rankine_cycle": {
        "file": "rankine-cycle.wav",
        "resource": "engine/examples/resources/rankine-cycle.md",
        "en": "Sketch a Rankine cycle from memory: pump, boiler, turbine, then condenser. Label the four states. Using the synthetic enthalpy values in the practice sheet, calculate pump input and turbine output, then subtract pump input to find net work. Divide net work by heat input for efficiency. Check that heat input minus rejected heat equals net work, and explain why turbine output alone gives the wrong efficiency.",
        "zh": "凭记忆画出朗肯循环：泵、锅炉、汽轮机、冷凝器，并标出四个状态。用练习纸上的合成焓值，先算泵耗功和汽轮机输出功，再相减得到净功。用净功除以吸热量计算效率。检查吸热量减放热量是否等于净功，并解释为什么只用汽轮机输出功计算效率会出错。",
    },
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect_wav(path):
    with wave.open(str(path), "rb") as audio:
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2:
            raise ValueError(f"Expected mono PCM16 WAV: {path.name}")
        frames, rate = audio.getnframes(), audio.getframerate()
        samples = audio.readframes(frames)
    duration = frames / rate
    if rate != 24000 or not 10 <= duration <= 90 or not any(samples):
        raise ValueError(f"Invalid or silent audio: {path.name}")
    return round(duration, 3), rate


def verify(output):
    manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
    if set(manifest) != set(PROMPTS):
        raise ValueError("Audio manifest must contain exactly four public topics")
    for topic, prompt in PROMPTS.items():
        entry = manifest[topic]
        path = output / prompt["file"]
        duration, rate = inspect_wav(path)
        if entry["src"] != f"/assets/audio/{prompt['file']}" or entry["provider"] != "Pocket TTS":
            raise ValueError(f"Unexpected source/provider for {topic}")
        if entry["sha256"] != sha256(path) or entry["durationSeconds"] != duration:
            raise ValueError(f"Audio integrity mismatch for {topic}")
        if entry["text"] != {"en": prompt["en"], "zh": prompt["zh"]}:
            raise ValueError(f"Transcript mismatch for {topic}")
        if entry["resourceSha256"] != sha256(ROOT / prompt["resource"]):
            raise ValueError(f"Source material changed; review and regenerate {topic}")
        words = len(prompt["en"].split())
        if not 45 <= words <= 70:
            raise ValueError(f"Prompt outside the 45–70 word limit: {topic} ({words})")
        print(f"Verified {topic}: {duration:.2f}s, {rate} Hz mono PCM16, {words} words", flush=True)


def generate(output):
    if importlib.metadata.version("pocket-tts") != PACKAGE_VERSION:
        raise RuntimeError(f"Use pocket-tts=={PACKAGE_VERSION}; review before changing the model version")
    import numpy as np
    import torch
    from pocket_tts import TTSModel
    from pocket_tts.utils.utils import get_predefined_voice

    torch.set_num_threads(2)
    torch.manual_seed(SEED)
    print(f"Loading Pocket TTS {PACKAGE_VERSION}: {LANGUAGE}, official {VOICE} preset", flush=True)
    model = TTSModel.load_model(language=LANGUAGE, temp=0.3, sampler_decode_steps=1,
                               noise_clamp=None, eos_threshold=-4.0, quantize=False)
    voice = model.get_state_for_audio_prompt(VOICE)
    weights = (model.config.weights_path if model.has_voice_cloning
               else model.config.weights_path_without_voice_cloning)
    generation = {
        "packageVersion": PACKAGE_VERSION,
        "model": LANGUAGE,
        "weights": weights,
        "voice": VOICE,
        "voiceEmbedding": get_predefined_voice(language=LANGUAGE, name=VOICE),
        "temperature": 0.3,
        "samplerDecodeSteps": 1,
        "maxTokensPerChunk": 50,
        "eosThreshold": -4.0,
        "noiseClamp": None,
        "framesAfterEos": None,
        "quantized": False,
        "device": "cpu",
        "cpuThreads": 2,
        "pythonVersion": platform.python_version(),
        "torchVersion": torch.__version__,
    }
    manifest = {}
    with tempfile.TemporaryDirectory(prefix="studygps-pocket-tts-") as temporary:
        staged = Path(temporary)
        for index, (topic, prompt) in enumerate(PROMPTS.items()):
            if not 45 <= len(prompt["en"].split()) <= 70:
                raise ValueError(f"Prompt must have 45–70 words: {topic}")
            torch.manual_seed(SEED + index)
            print(f"Generating {topic}...", flush=True)
            audio = model.generate_audio(voice, prompt["en"], max_tokens=50, copy_state=True)
            samples = audio.detach().cpu().numpy().reshape(-1)
            peak = float(np.max(np.abs(samples)))
            if not math.isfinite(peak) or peak < 0.001 or not np.isfinite(samples).all():
                raise ValueError(f"Model produced invalid/silent audio for {topic}")
            # Leave headroom without boosting quiet speech; write browser-compatible PCM16.
            gain = min(1.0, 0.95 / peak)
            pcm = np.rint(np.clip(samples * gain, -1, 1) * 32767).astype("<i2")
            path = staged / prompt["file"]
            with wave.open(str(path), "wb") as destination:
                destination.setnchannels(1)
                destination.setsampwidth(2)
                destination.setframerate(model.sample_rate)
                destination.writeframes(pcm.tobytes())
            duration, rate = inspect_wav(path)
            manifest[topic] = {
                "src": f"/assets/audio/{prompt['file']}",
                "provider": "Pocket TTS",
                "language": "en",
                "text": {"en": prompt["en"], "zh": prompt["zh"]},
                "durationSeconds": duration,
                "sampleRate": rate,
                "sha256": sha256(path),
                "resource": prompt["resource"],
                "resourceSha256": sha256(ROOT / prompt["resource"]),
                "attribution": "Synthetic audio: Kyutai Pocket TTS. Official alba voice by Alba MacKenna, CC BY 4.0. Adapted public StudyGPS practice text.",
                "voiceSource": "https://huggingface.co/kyutai/tts-voices/tree/main/alba-mackenna",
                "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                "generation": {**generation, "seed": SEED + index, "outputGain": round(gain, 6)},
            }
            print(f"Generated {topic}: {duration:.2f}s, {path.stat().st_size} bytes", flush=True)
        (staged / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        verify(staged)
        output.mkdir(parents=True, exist_ok=True)
        for prompt in PROMPTS.values():
            shutil.copyfile(staged / prompt["file"], output / prompt["file"])
        # Publish the manifest only after all four actual audio files exist.
        manifest_temp = output / "manifest.json.tmp"
        shutil.copyfile(staged / "manifest.json", manifest_temp)
        os.replace(manifest_temp, output / "manifest.json")
    verify(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="Verify existing assets without installing or running TTS")
    args = parser.parse_args()
    if args.verify:
        verify(OUTPUT)
    else:
        generate(OUTPUT)
