// ==UserScript==
// @name         ChatGPT Text-to-Speech
// @namespace    https://github.com/MJakubec/UserScripts
// @version      0.1.2
// @description  Provides a text-to-speech service for generated text content.
// @author       Michal Jakubec
// @updateURL    https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/TextToSpeech/ChatGptTextToSpeech.user.js
// @downloadURL  https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/TextToSpeech/ChatGptTextToSpeech.user.js
// @require      https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.6.4.min.js#sha256=a0fe8723dcf55da64d06b25446d0a8513e52527c45afcb37073465f9c6f352af
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.4/FileSaver.min.js#sha256=1433b8feb185bd8e81db7d2d1ea7330140531b72158300f8e26c98df1e853b21
// @require      https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/TextToSpeech/Modules/AzureSpeaker.js
// @match        https://chat.openai.com/chat
// @match        https://chat.openai.com/chat/*
// @match        https://chat.openai.com/chat?*
// @noframes
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(async () => {
  'use strict';

  const checkTimerPeriodInMilliseconds = 500;

  const configErrorMessage = 'You have to configure at least "speechServiceRegionId" and "speechServiceAccessKey" parameters according to the Azure Speech resource you have created in your Azure cloud tenant. Please provide appropriate configuration values in the settings of this userscript.';

  const defaultLanguages = [
    {
      title: 'EN',
      languageId: 'en-US',
      voiceId: 'en-US-AmberNeural'
    },
    {
      title: 'CZ',
      languageId: 'cs-CZ',
      voiceId: 'cs-CZ-AntoninNeural'
    },
    {
      title: 'DE',
      languageId: 'de-DE',
      voiceId: 'de-DE-AmalaNeural'
    }
  ];

  const speakButtonMarkup = '<button id="tts-speak" title="Read aloud" class="btn relative btn-neutral border-0 md:border text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg></button>';
  const autoplayButtonMarkup = '<button id="tts-autoplay" title="Toggle auto-play" class="btn relative btn-neutral border-0 md:border text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg></button>';
  const languageDropdownMarkup = '<select id="tts-language" title="Change language" style="width: 70px" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"></select>';
  const voiceDropdownMarkup = '<select id="tts-voice" title="Change voice" style="width: 130px" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"></select>';

  const dropdownOptionTemplate = '<option value="{{mark}}">{{title}}</option>';
  const sentenceTagTemplate = '<span class="tts-sentence">{{text}}</span>';

  const divisionSelector = 'main .markdown.prose';
  const contentSelector = 'p, ol, ul';
  const sentenceSelector = 'span.tts-sentence';
  const toolbarSelector = 'form div.md\\:w-full.justify-center';

  const buttonSpeakSelector = 'button#tts-speak';
  const buttonAutoplaySelector = 'button#tts-autoplay';
  const dropdownLanguageSelector = 'select#tts-language';
  const dropdownVoiceSelector = 'select#tts-voice';

  const sentenceSplittingRegExpMatch = '(?<=\\p{L}[.?!])\\s+(?=[\\p{Lu}\\p{M}(])';
  const sentenceSplittingRegExpOptions = 'gmu'; 

  const czechLanguageId = 'cs-CZ';
  const czechLanguageDetectionRegExp = '[À-ž]';
  
  let speaker = null;

  let speechServiceRegionId = '';
  let speechServiceAccessKey = '';

  let languages = defaultLanguages;
  let voices = [];

  let autoplayActive = false;
  let isSpeaking = false;
  let audio = null;

  let nextContentIndex = 0;

  let pendingSentences = [];
  let currentSentence = null;

  let currentLanguageId = 'en-US';
  let currentVoiceId = 'en-US-ChristopherNeural';

  let toolbar = $();
  let buttonSpeak = $();
  let buttonAutoplay = $();
  let dropdownLanguage = $();
  let dropdownVoice = $();

  const errorMessagePrefix = 'ChatGPT Text-to-Speech Error: ';

  function placeholder(name)
  {
    return '{{name}}'.replace('name', name);
  }

  function reportError(message)
  {
    console.error(errorMessagePrefix);
    console.error(message);
  }

  function continueWithSpeech()
  {
    buttonSpeak.removeClass('bg-green-100');

    audio = null;

    unhighlightCurrentSentence();
    currentSentence = null;

    triggerSpeech();
  }

  function onSpeechReady(blob)
  {
    buttonSpeak.removeClass('bg-yellow-100');
    buttonSpeak.addClass('bg-green-100');

    const audioUrl = URL.createObjectURL(blob);
    audio = new Audio(audioUrl);
    audio.addEventListener('ended', continueWithSpeech);
    audio.play();
  }

  function onSpeechFailure(request)
  {
    buttonSpeak.removeClass('bg-yellow-100');

    reportError('Generating speech failed with error: ' + request.responseText);
    continueWithSpeech();
  }

  function isInCzechLanguage(text)
  {
    const regexp = new RegExp(czechLanguageDetectionRegExp, 'i');
    return regexp.test(text);
  }

  function speak(text)
  {
    buttonSpeak.addClass('bg-yellow-100');

    let languageId = currentLanguageId;
    let voiceId = currentVoiceId;

    if (languageId != czechLanguageId)
    {
      if (isInCzechLanguage(text))
      {
        languageId = czechLanguageId;
        voiceId = lookupVoiceIdByLanguage(languageId);
      }
    }

    speaker.generateSpeech(text, languageId, voiceId, onSpeechReady, onSpeechFailure);
  }

  function highlightCurrentSentence()
  {
    $(currentSentence).addClass('bg-green-100');
  }

  function unhighlightCurrentSentence()
  {
    $(currentSentence).removeClass('bg-green-100');
  }

  function fetchNextSentence()
  {
    currentSentence = pendingSentences.shift();
  }

  function triggerSpeech()
  {
    while (true)
    {
      if (pendingSentences.length == 0)
      {
        processNextContentBlock();

        if (pendingSentences.length == 0)
        {
          isSpeaking = false;
          updateSpeakButtonState();
          break;
        }
      }

      fetchNextSentence();

      const text = $(currentSentence).text().trim();

      if (text.length > 0)
      {
        const hasLetters = text.match(/[a-z0-9]/i);

        if (hasLetters)
        {
          highlightCurrentSentence();
          speak(text);
          break;
        }
      }
    }
  }

  function stopSpeaking()
  {
    if (audio != null)
    {
      audio.pause();
      audio = null;
    }

    buttonSpeak.removeClass('bg-yellow-100');
    buttonSpeak.removeClass('bg-green-100');

    unhighlightCurrentSentence();

    nextContentIndex = lookupContents().length;
    pendingSentences = [];
    isSpeaking = false;

    updateSpeakButtonState();
  }

  function parseParagraphToSentences(text)
  {
    const regex = new RegExp(sentenceSplittingRegExpMatch, sentenceSplittingRegExpOptions);

    const sentences = text.split(regex);
    const result = [];
    let joinedSentence = "";

    while (true)
    {
      const sentence = (sentences.length > 0 ? sentences.shift() : null);
      if (sentence != null)
      {
        const openTags = (sentence.match(/<[^/]+>/g) || []).map(tag => tag.toLowerCase());
        const closingTags = (sentence.match(/<\/[^>]+>/g) || []).map(tag => tag.toLowerCase());
  
        if (openTags.length !== closingTags.length) {
          joinedSentence += sentence;
          continue;
        }
      }
  
      if (joinedSentence.length > 0)
      {
        result.push(joinedSentence);
        joinedSentence = '';
      }
  
      if (sentence == null)
        break;
  
      result.push(sentence);
    }
  
    return result;
  }

  function tryExtractSentencesFromParagraph(paragraph)
  {
    const sentences = $(paragraph).find(sentenceSelector);

    if (sentences.length == 0)
      return false;

    sentences.each((index, element) => {
      pendingSentences.push(element);
    });

    return true;
  }

  function embedParagraphSentences(paragraph)
  {
    const sentences = parseParagraphToSentences(paragraph.innerHTML);

    let output = '';

    for (let index = 0; index < sentences.length; index++)
    {
      const sentence = sentences[index];

      const markup = sentenceTagTemplate
        .replace(placeholder('text'), sentence);

      output += markup;

      if (index + 1 < sentences.length)
        output += ' ';
    }

    paragraph.innerHTML = output;
  }

  function processSingleParagraph(element)
  {
    embedParagraphSentences(element);
    tryExtractSentencesFromParagraph(element);
  }

  function processComplexParagraph(element)
  {
    const contents = $(element).contents();
    const notPlainText = (contents.length > 1 || contents[0].nodeType !== 3);

    if (notPlainText)
      $(contents).each((index, element) => { processGenericContent(element); });
    else
      processSingleParagraph(element);
  }

  function processGenericContent(content)
  {
    const name = content.nodeName.toLowerCase();

    if (name == 'p')
      processComplexParagraph(content);
    else if (name == 'ol' || name == 'ul')
    {
      const bullets = $(content).find('li');
      $(bullets).each((index, element) => { processComplexParagraph(element); });
    }
  }

  function lookupContents()
  {
    const division = $(divisionSelector);
    let contents = division.find(contentSelector);

    const alreadyGenerating = division.hasClass('result-streaming');

    if (alreadyGenerating)
      contents = contents.not(':last');

    return contents;
  }

  function processNextContentBlock()
  {
    const contents = lookupContents();

    if (nextContentIndex < contents.length)
    {
      const content = contents[nextContentIndex];
      const sentences = $(content).find(sentenceSelector);

      const alreadyParsed = tryExtractSentencesFromParagraph(content);

      if (!alreadyParsed)
        processGenericContent(content);

      nextContentIndex++;
    }
  }

  function checkForText()
  {
    if (!isSpeaking)
    {
      processNextContentBlock();

      if (pendingSentences.length > 0)
      {
        isSpeaking = true;
        updateSpeakButtonState();
        triggerSpeech();
      }
    }
  }

  function updateSpeakButtonState()
  {
    if (isSpeaking)
    {
      buttonSpeak.addClass('speaking');
      buttonSpeak.addClass('text-red-500');
      buttonSpeak.removeClass('text-gray-400');
    }
    else
    {
      buttonSpeak.addClass('text-gray-400');
      buttonSpeak.removeClass('text-red-500');
      buttonSpeak.removeClass('speaking');
    }
  }

  function updateAutoplayButtonState()
  {
    if (autoplayActive)
    {
      buttonAutoplay.addClass('text-gray-800');
      buttonAutoplay.removeClass('text-gray-400');
    }
    else
    {
      buttonAutoplay.addClass('text-gray-400');
      buttonAutoplay.removeClass('text-gray-800');
    }
  }

  function lookupCurrentLanguageId()
  {
    currentLanguageId = dropdownLanguage.val();
  }

  function lookupVoiceIdByLanguage(languageId)
  {
    const results = languages.filter(l => l.languageId == languageId);
    return (results.length > 0 ? results[0].voiceId : null);
  }

  function lookupCurrentVoiceId()
  {
    currentVoiceId = lookupVoiceIdByLanguage(currentLanguageId);
  }

  function selectCurrentLanguageId()
  {
    dropdownLanguage.val(currentLanguageId);
  }

  function selectCurrentVoiceId()
  {
    dropdownVoice.val(currentVoiceId);
  }

  function appendDropdownOption(dropdown, title, mark)
  {
    const optionTag = dropdownOptionTemplate
      .replace(placeholder('mark'), mark)
      .replace(placeholder('title'), title);
    dropdown.append(optionTag);
  }

  function loadLanguageDropdown()
  {
    dropdownLanguage.empty();

    for (const language of languages)
      appendDropdownOption(dropdownLanguage, language.title, language.languageId);

    if (currentLanguageId != null)
      selectCurrentLanguageId();
    else
      lookupCurrentLanguageId();

    lookupCurrentVoiceId();
  }

  function loadVoiceDropdown()
  {
    dropdownVoice.empty();

    const currentLanguageVoices = voices
      .filter(v => v.Locale == currentLanguageId)
      .sort((a, b) => a.DisplayName.localeCompare(b.DisplayName));

    for (const voice of currentLanguageVoices)
      appendDropdownOption(dropdownVoice, voice.DisplayName, voice.ShortName);

    if (currentVoiceId != null)
      selectCurrentVoiceId();
    else
      lookupCurrentVoiceId();
  }

  function onLanguageDropdownChange()
  {
    lookupCurrentLanguageId();
    lookupCurrentVoiceId();
    loadVoiceDropdown();
  }

  function onVoiceDropdownChange()
  {
    currentVoiceId = dropdownVoice.val();

    const results = languages.filter(l => l.languageId == currentLanguageId);

    if (results.length == 0)
      return;

    results[0].voiceId = currentVoiceId;
    GM.setValue('languages', languages);
  }

  function onToggleSpeak(event)
  {
    event.preventDefault();

    if (!isSpeaking)
    {
      nextContentIndex = 0;

      if (!autoplayActive)
        checkForText();
    }
    else
      stopSpeaking();

    updateSpeakButtonState();
  }

  function onToggleAutoplay(event)
  {
    event.preventDefault();

    const contents = lookupContents();
    nextContentIndex = contents.length;

    autoplayActive = !autoplayActive;
    updateAutoplayButtonState();
  }

  function checkMarkup()
  {
    toolbar = $(toolbarSelector);

    if (toolbar.length == 0)
      return;

    if (toolbar.has(buttonSpeakSelector).length == 0)
    {
      stopSpeaking();
      toolbar.append(speakButtonMarkup);
      buttonSpeak = $(buttonSpeakSelector);
      updateSpeakButtonState();
      buttonSpeak.on('click', onToggleSpeak);
    }

    if (toolbar.has(buttonAutoplaySelector).length == 0)
    {
      toolbar.append(autoplayButtonMarkup);
      buttonAutoplay = $(buttonAutoplaySelector);
      updateAutoplayButtonState();
      buttonAutoplay.on('click', onToggleAutoplay);
    }

    if (toolbar.has(dropdownLanguageSelector).length == 0)
    {
      toolbar.append(languageDropdownMarkup);
      dropdownLanguage = $(dropdownLanguageSelector);
      loadLanguageDropdown();
      dropdownLanguage.on('change', onLanguageDropdownChange);
    }

    if (toolbar.has(dropdownVoiceSelector).length == 0)
    {
      toolbar.append(voiceDropdownMarkup);
      dropdownVoice = $(dropdownVoiceSelector);
      loadVoiceDropdown();
      dropdownVoice.on('change', onVoiceDropdownChange);
    }
  }

  function checkAll()
  {
    checkMarkup();

    if (autoplayActive)
      checkForText();
  }

  function activateCheckTimer()
  {
    setInterval(checkAll, checkTimerPeriodInMilliseconds);
  }

  function onVoiceListReady(result)
  {
    voices = result;
    activateCheckTimer();
  }

  function onVoiceListFailure(request)
  {
    console.error('Failure of loading voice list with HTTP status code: ' + request.status);
  }

  function loadVoiceList()
  {
    speaker.getVoiceList(onVoiceListReady, onVoiceListFailure);
  }

  async function loadScriptSettings()
  {
    languages = await GM.getValue('languages', defaultLanguages);
    speechServiceRegionId = await GM.getValue('speechServiceRegionId', '');
    speechServiceAccessKey = await GM.getValue('speechServiceAccessKey', '');

    const hasLanguages = (languages != null);
    const hasRegionId = (speechServiceRegionId.length > 0);
    const hasAccessKey = (speechServiceAccessKey.length > 0);

    if (hasRegionId && hasAccessKey)
      return true;

    if (!hasRegionId)
      await GM.setValue('speechServiceRegionId', '');
    if (!hasAccessKey)
      await GM.setValue('speechServiceAccessKey', '');

    if (!hasRegionId || !hasAccessKey)
      alert(configErrorMessage);

    return false;
  }

  function prepareSpeaker()
  {
    speaker = new AzureSpeaker(speechServiceRegionId, speechServiceAccessKey);
  }

  async function initializeUserScript()
  {
    if (await loadScriptSettings())
    {
      prepareSpeaker();
      loadVoiceList();
    }
  }

  await initializeUserScript();
})();