'use strict';

class AzureTranscriber
{
  constructor(regionId, accessKey, onTranscriptionDone, onError)
  {
    this.regionId = regionId;
    this.accessKey = accessKey;
    this.onTranscriptionDone = onTranscriptionDone;
    this.onError = onError;
    this.serviceUrl = 'https://{{region}}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language={{language}}';
  }

  onSpeechServiceResponse(event)
  {
    if (event.target.readyState != 4)
      return;

    const succeeded = (event.target.status == 200);

    if (succeeded)
    {
      const json = event.target.responseText;
    
      const result = JSON.parse(json);

      if (this.onTranscriptionDone != null)
        this.onTranscriptionDone(result);
    }
    else
    {
      if (this.onError != null)
        this.onError(event.target.status);
    }
  }
  
  transcribe(audioBlob, languageId)
  {
    const url = this.serviceUrl
      .replace('{{region}}', this.regionId)
      .replace('{{language}}', languageId);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = this.onSpeechServiceResponse.bind(this);
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Ocp-Apim-Subscription-Key', this.accessKey);
    xhr.setRequestHeader('Content-Type', 'audio/wav');
    xhr.send(audioBlob);
  }
}
