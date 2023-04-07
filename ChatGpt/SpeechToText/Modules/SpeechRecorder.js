'use strict';

class SpeechRecorder
{
  constructor(audioGateModuleUrl, onActivate, onDeactivate, onSpeechStart, onSpeechEnd, onSpeechAvailable)
  {
    this.audioGateModuleUrl = audioGateModuleUrl;
    this.onActivate = onActivate;
    this.onDeactivate = onDeactivate;
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
    this.onSpeechAvailable = onSpeechAvailable;

    this.isActive = false;
    this.isRecording = false;

    this.microphoneStream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.gateNode = null;
    this.audioThreshold = null;
    this.destinationNode = null;
    this.mediaRecorder = null;
  }

  isSupportedByBrowser()
  {
    const hasAudioContext = window.AudioContext;
    const hasMediaStream = window.MediaStreamAudioSourceNode;
    const hasAudioWorklet = window.AudioWorkletNode;

    return (hasAudioContext || hasMediaStream || hasAudioWorklet);
  }

  checkBrowserSupport()
  {
    if (this.isSupportedByBrowser())
      return;

    const message = 'Your browser does not support the required Media APIs needed for recording speech.';
    throw new Error(message);
  }

  onAudioDataAvailable(blob)
  {
    this.onSpeechAvailable(blob);
    this.mediaRecorder.clear();
  }

  startAudioCapture()
  {
    this.mediaRecorder.record();
    this.isRecording = true;

    if (this.onSpeechStart != null)
      this.onSpeechStart();
  }

  stopAudioCapture()
  {
    this.mediaRecorder.stop();
    this.isRecording = false;

    this.mediaRecorder.exportWAV(this.onAudioDataAvailable.bind(this));

    if (this.onSpeechEnd != null)
      this.onSpeechEnd();
  }

  onAudioStateChange(event)
  {
    if (event.data === 'active')
      this.startAudioCapture();
    else
      this.stopAudioCapture();
  }

  async acquireMicrophoneStream()
  {
    this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  releaseMicrophoneStream()
  {
    if (this.microphoneStream == null)
      return;

    const tracks = this.microphoneStream.getAudioTracks();

    for (const track of tracks)
      track.enabled = false;

    this.microphoneStream = null;
  }

  async prepareAudioContext()
  {
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule(this.audioGateModuleUrl);
  }

  releaseAudioContext()
  {
    if (this.audioContext == null)
      return;
    this.audioContext.close();
    this.audioContext = null;
  }

  prepareAudioPipeline()
  {
    const options = {
      numberOfInputs: 1,
      numberOfOutputs: 1
    };

    this.gateNode = new AudioWorkletNode(this.audioContext, 'audio-gate', options);
    this.gateNode.port.onmessage = this.onAudioStateChange.bind(this);

    this.sourceNode = this.audioContext.createMediaStreamSource(this.microphoneStream);
    this.sourceNode.connect(this.gateNode);

    this.mediaRecorder = new Recorder(this.gateNode);
  }

  releaseAudioPipeline()
  {
    if (this.sourceNode != null)
    {
      if (this.gateNode != null)
        this.sourceNode.disconnect(this.gateNode);
      if (this.destinationNode != null)
        this.sourceNode.disconnect(this.destinationNode);
    }

    this.sourceNode = null;
    this.gateNode = null;
    this.mediaRecorder = null;
  }

  getAudioParams()
  {
    const params = this.gateNode.parameters;

    const values = {
      delayedChunkCount: params.get('delayedChunkCount').value,
      intensityThreshold: params.get('intensityThreshold').value,
      silenceBlockCount: params.get('silenceBlockCount').value
    };

    return values;
  }

  setAudioParams(values)
  {
    const params = this.gateNode.parameters;

    params.get('delayedChunkCount').value = parseInt(values.delayedChunkCount);
    params.get('intensityThreshold').value = parseInt(values.intensityThreshold);
    params.get('silenceBlockCount').value = parseInt(values.silenceBlockCount);
  }

  async activate()
  {
    this.checkBrowserSupport();
    await this.acquireMicrophoneStream();
    await this.prepareAudioContext();
    this.prepareAudioPipeline();
    this.isActive = true;

    if (this.onActivate != null)
      this.onActivate();
  }

  deactivate()
  {
    this.releaseAudioPipeline();
    this.releaseAudioContext();
    this.releaseMicrophoneStream();
    this.isActive = false;

    if (this.onDeactivate != null)
      this.onDeactivate();
  }
}
