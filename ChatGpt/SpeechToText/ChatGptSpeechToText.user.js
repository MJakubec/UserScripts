// ==UserScript==
// @name         ChatGPT Speech-to-Text
// @namespace    https://github.com/MJakubec/UserScripts
// @version      0.1.1
// @description  Provides speech transcription service for prompting with use of a voice.
// @author       Michal Jakubec
// @updateURL    https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/SpeechToText/ChatGptSpeechToText.user.js
// @downloadURL  https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/SpeechToText/ChatGptSpeechToText.user.js
// @require      https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.6.4.min.js#sha256=a0fe8723dcf55da64d06b25446d0a8513e52527c45afcb37073465f9c6f352af
// @require      https://cdnjs.cloudflare.com/ajax/libs/recorderjs/0.1.0/recorder.js#sha512=zSq4Vvm00k8M01OLF/SmwKryVpA7YVXIbEFHU1rvNw3pgH50SjL6O4nDbB65V76YKWmr3rPABOXJ+uz+Z3BEmw==
// @require      https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/SpeechToText/Modules/AzureTranscriber.js
// @require      https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/SpeechToText/Modules/SpeechRecorder.js
// @resource     AudioGate https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/SpeechToText/Modules/AudioGate.js
// @match        https://chat.openai.com/chat
// @match        https://chat.openai.com/chat/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @noframes
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

(async function() {
  'use strict';

  const checkMarkupPeriodInMilliseconds = 500;

  const toggleRecordingButtonMarkup = '<button id="stt-toggle-recording" title="Toggle speech transcription" class="btn relative btn-neutral border-0 md:border text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg></button>';
  const toggleLanguageButtonMarkup = '<button id="stt-toggle-language" title="Change language" class="btn relative btn-neutral border-0 md:border text-gray-800"></button>';
  const toggleSubmitButtonMarkup = '<button id="stt-toggle-submit" title="Toggle auto-submit" class="btn relative btn-neutral border-0 md:border text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg></button>';

  const containerSelectorQuery = 'form div.md\\:w-full.justify-center';

  const languages = [{ name: 'EN', mark: 'en-US' }, { name: 'CZ', mark: 'cs-CZ' }];

  var currentLanguage = languages[0];
  var useAutoSubmit = false;
  var recorder = null;
  var transcriber = null;

  var speechServiceRegionId = '';
  var speechServiceAccessKey = '';

  function lookupContainer()
  {
    return $(containerSelectorQuery);
  }

  function lookupToggleRecordingButton()
  {
    return $('button#stt-toggle-recording');
  }

  function lookupToggleLanguageButton()
  {
    return $('button#stt-toggle-language');
  }

  function lookupToggleSubmitButton()
  {
    return $('button#stt-toggle-submit');
  }

  async function onRecorderActivate()
  {
    await loadAudioParams();
    updateToggleRecordingButtonState();
  }

  function onRecorderDeactivate()
  {
    updateToggleRecordingButtonState();
  }

  function onSpeechStart()
  {
    const button = lookupToggleRecordingButton();
    button.addClass('bg-green-100');
  }

  function onSpeechEnd()
  {
    const button = lookupToggleRecordingButton();
    button.removeClass('bg-green-100');
  }

  function onSpeechAvailable(blob)
  {
    const button = lookupToggleRecordingButton();
    button.addClass('bg-yellow-100');
    transcriber.transcribe(blob, currentLanguage.mark);
  }

  function lookupEntry()
  {
    return $('textarea');
  }

  function lookupEntrySubmitButton()
  {
    return lookupEntry().next('button');
  }

  function updateEntryHeight()
  {
    const entry = lookupEntry();
    const originalHeight = entry.height();
    entry.height(0);
    var newHeight = entry.get(0).scrollHeight - entry.css('paddingTop').replace('px','')*1 - entry.css('paddingBottom').replace('px','')*1;
    entry.height(newHeight);
  }

  function enableEntrySubmitButton()
  {
    const button = lookupEntrySubmitButton();
    button.prop('disabled', false);
  }

  function clickEntrySubmitButton()
  {
    const button = lookupEntrySubmitButton();
    button.trigger('click');
  }

  function updateEntryTextWithTranscription(transcription)
  {
    const entry = lookupEntry();
    var text = entry.val();
    const hasText = (text.length > 0);

    if (hasText)
      text += ' ';

    text += transcription;

    entry.val(text);
    entry.focus();

    updateEntryHeight();
    enableEntrySubmitButton();

    const press = $.Event('keypress');
    press.which = 35;
    entry.trigger(press);
  }

  function onTranscriptionDone(result)
  {
    const button = lookupToggleRecordingButton();
    button.removeClass('bg-yellow-100');

    if (result.RecognitionStatus != 'Success')
      return;

    updateEntryTextWithTranscription(result.DisplayText);

    if (useAutoSubmit)
      clickEntrySubmitButton();

    setTimeout(updateEntryHeight, 200);
  }

  function updateToggleRecordingButtonState()
  {
    const button = lookupToggleRecordingButton();

    if (recorder.isActive)
    {
      button.addClass('text-red-500');
      button.removeClass('text-gray-400');
    }
    else
    {
      button.addClass('text-gray-400');
      button.removeClass('text-red-500');
    }
  }

  function updateToggleLanguageButtonState()
  {
    const button = lookupToggleLanguageButton();
    button.text(currentLanguage.name);
  }

  function updateToggleSubmitButtonState()
  {
    const button = lookupToggleSubmitButton();

    if (useAutoSubmit)
    {
      button.addClass('text-gray-800');
      button.removeClass('text-gray-400');
    }
    else
    {
      button.addClass('text-gray-400');
      button.removeClass('text-gray-800');
    }
  }

  function checkBrowserCompatibility()
  {
    const supported = recorder.isSupportedByBrowser();
    if (!supported)
    {
      alert('This feature is not supported by your browser. Please try to update your browser to a more recent version.');
      return false;
    }
    return true;
  }

  async function storeAudioParams()
  {
    await GM.setValue('silenceBlockCount', 400);
    await GM.setValue('intensityThreshold', 25);
    await GM.setValue('delayedChunkCount', 100);
  }

  async function loadAudioParams()
  {
    const silenceBlockCount = await GM.getValue('silenceBlockCount');
    const intensityThreshold = await GM.getValue('intensityThreshold');
    const delayedChunkCount = await GM.getValue('delayedChunkCount');

    if (silenceBlockCount.length == 0)
      return;
    if (intensityThreshold.length == 0)
      return;
    if (delayedChunkCount.length == 0)
      return;

    const values = {
      delayedChunkCount: parseInt(delayedChunkCount),
      intensityThreshold: parseInt(intensityThreshold),
      silenceBlockCount: parseInt(silenceBlockCount)
    };

    recorder.setAudioParams(values);
  }

  async function loadConfigurationValues()
  {
    speechServiceRegionId = await GM.getValue('speechServiceRegionId', '');
    speechServiceAccessKey = await GM.getValue('speechServiceAccessKey', '');

    const hasRegionId = (speechServiceRegionId.length > 0);
    const hasAccessKey = (speechServiceAccessKey.length > 0);

    if (hasRegionId && hasAccessKey)
    {
      transcriber.regionId = speechServiceRegionId;
      transcriber.accessKey = speechServiceAccessKey;
      return true;
    }

    if (!hasRegionId)
      await GM.setValue('speechServiceRegionId', '');
    if (!hasAccessKey)
      await GM.setValue('speechServiceAccessKey', '');

    await storeAudioParams();

    alert('You have to configure at least "speechServiceRegionId" and "speechServiceAccessKey" parameters according to the Azure Speech resource you have created in your Azure cloud tenant. Please provide appropriate configuration values in the settings of this userscript.');

    return false;
  }

  function toggleRecorderState()
  {
    if (!recorder.isActive)
      recorder.activate();
    else
      recorder.deactivate();
  }

  async function onToggleRecording(event)
  {
    if (!checkBrowserCompatibility())
      return;
    if (!await loadConfigurationValues())
      return;

    await toggleRecorderState();

    event.preventDefault();
  }

  function onToggleLanguage(event)
  {
    var index = languages.indexOf(currentLanguage);
    index = (index + 1) % languages.length;
    currentLanguage = languages[index];
    updateToggleLanguageButtonState();

    event.preventDefault();
  }

  function onToggleSubmit(event)
  {
    useAutoSubmit = !useAutoSubmit;
    updateToggleSubmitButtonState();
    event.preventDefault();
  }

  function checkMarkup()
  {
    const selector = lookupContainer();

    if (selector.has('button#stt-toggle-submit').length == 0)
    {
      selector.prepend(toggleSubmitButtonMarkup);
      updateToggleSubmitButtonState();
      const button = lookupToggleSubmitButton();
      button.on('click', onToggleSubmit);
    }

    if (selector.has('button#stt-toggle-language').length == 0)
    {
      selector.prepend(toggleLanguageButtonMarkup);
      updateToggleLanguageButtonState();
      const button = lookupToggleLanguageButton();
      button.on('click', onToggleLanguage);
    }

    if (selector.has('button#stt-toggle-recording').length == 0)
    {
      selector.prepend(toggleRecordingButtonMarkup);
      updateToggleRecordingButtonState();
      const button = lookupToggleRecordingButton();
      button.on('click', onToggleRecording);
    }
  }

  function activateCheckTimer()
  {
    setInterval(checkMarkup, checkMarkupPeriodInMilliseconds);
  }

  function prepareAudioGateModuleUrl()
  {
    const text = GM_getResourceText('AudioGate');
    const blob = new Blob([text], { type: 'text/javascript' });
    return URL.createObjectURL(blob);
  }

  function initializeWorkers()
  {
    recorder = new SpeechRecorder(
      prepareAudioGateModuleUrl(),
      onRecorderActivate,
      onRecorderDeactivate,
      onSpeechStart,
      onSpeechEnd,
      onSpeechAvailable
    );

    transcriber = new AzureTranscriber(
      speechServiceRegionId,
      speechServiceAccessKey,
      onTranscriptionDone
    );
  }

  initializeWorkers();
  activateCheckTimer();
})();