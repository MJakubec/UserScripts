'use strict';

class AzureTranscriber
{
  constructor(regionId, accessKey, onTranscriptionDone)
  {
    this.regionId = regionId;
    this.accessKey = accessKey;
    this.onTranscriptionDone = onTranscriptionDone;
    this.serviceUrl = 'https://{{region}}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language={{language}}';
  }

  onSpeechServiceResponse(event)
  {
    const json = event.target.responseText;
  
    $('#speech-response').text(json);
  
    const result = JSON.parse(json);
    if (this.onTranscriptionDone != null)
      this.onTranscriptionDone(result);
  }
  
  transcribe(audioBlob, languageId)
  {
    const url = this.serviceUrl
      .replace('{{region}}', this.regionId)
      .replace('{{language}}', languageId);
    var xhr = new XMLHttpRequest();
    xhr.onload = this.onSpeechServiceResponse.bind(this);
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Ocp-Apim-Subscription-Key', this.accessKey);
    xhr.setRequestHeader('Content-Type', 'audio/wav');
    xhr.send(audioBlob);
  }
}
