'use strict';

class AzureSpeaker
{
  constructor(regionId, accessKey)
  {
    this.regionId = regionId;
    this.accessKey = accessKey;
    this.speechUrl = 'https://{{region}}.tts.speech.microsoft.com/cognitiveservices/v1';
    this.voiceUrl = 'https://{{region}}.tts.speech.microsoft.com/cognitiveservices/voices/list';
    this.speechRequestBody = '<speak version="1.0" xml:lang="{{language}}"><voice name="{{voice}}" xml:lang="{{language}}">{{text}}</voice></speak>';
  }

  placeholder(name)
  {
    return new RegExp('\{\{name\}\}'.replace('name', name), 'g');
  }

  replaceAll(text, find, replace)
  {

  }

  escapeXml(unsafe)
  {
    return unsafe.replace(/[<>&'"]/g, (character) => {
      switch (character)
      {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  getVoiceList(onReady, onFailure)
  {
    const url = this.voiceUrl.replace(this.placeholder('region'), this.regionId);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Ocp-Apim-Subscription-Key', this.accessKey);
    xhr.responseType = 'json';
    xhr.onload = (event) =>
    {
      if (event.target.status == 200)
        onReady(event.target.response);
      else
        onFailure(event.target);
    }
    xhr.onerror = (event) =>
    {
      onFailure(event.target);
    }
    xhr.onabort = xhr.onerror;
    xhr.send();
  }

  generateSpeech(text, languageId, voiceId, onReady, onFailure)
  {
    const url = this.speechUrl
      .replace(this.placeholder('region'), this.regionId);

    const data = this.speechRequestBody
      .replace(this.placeholder('language'), languageId)
      .replace(this.placeholder('voice'), voiceId)
      .replace(this.placeholder('text'), this.escapeXml(text));

    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Ocp-Apim-Subscription-Key', this.accessKey);
    xhr.setRequestHeader('Content-Type', 'application/ssml+xml');
    xhr.setRequestHeader('X-Microsoft-OutputFormat', 'audio-24khz-48kbitrate-mono-mp3');
    xhr.responseType = 'blob';
    xhr.onload = (event) =>
    {
      if (event.target.status == 200)
        onReady(event.target.response);
      else
        onFailure(event.target);
    }
    xhr.onerror = (event) =>
    {
      onFailure(event.target);
    }
    xhr.onabort = xhr.onerror;
    xhr.send(data);
  }
}