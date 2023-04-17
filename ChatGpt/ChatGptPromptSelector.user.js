// ==UserScript==
// @name         ChatGPT Prompt Selector
// @namespace    https://github.com/MJakubec/UserScripts
// @version      0.1.5
// @description  Allows to easily select a prompt from a prepared dataset.
// @author       Michal Jakubec
// @updateURL    https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/ChatGptPromptSelector.user.js
// @downloadURL  https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/ChatGptPromptSelector.user.js
// @require      https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.6.4.min.js#sha256=a0fe8723dcf55da64d06b25446d0a8513e52527c45afcb37073465f9c6f352af
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.4/FileSaver.min.js#sha256=1433b8feb185bd8e81db7d2d1ea7330140531b72158300f8e26c98df1e853b21
// @match        https://chat.openai.com/*
// @noframes
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  const categoryDropdownName = 'chatgpt-prompt-selector-category';
  const subcategoryDropdownName = 'chatgpt-prompt-selector-subcategory';
  const categoryDropdownPlaceholder = '[vyberte režim]';
  const subcategoryDropdownPlaceholder = '[vyberte téma]';

  const categoryDropdownWidthInPixels = 250;
  const subcategoryDropdownWidthInPixels = 300;
  const defaultEntryHeightInPixels = 24;

  const checkMarkupPeriodInMilliseconds = 500;
  const entryHeightResetDelayInMilliseconds = 500;

  const containerSelectorQuery = 'form div.md\\:w-full.justify-center';
  const entrySelectorQuery = 'textarea';

  const selectStartTagTemplate = '<select id="{{id}}" style="width: {{width}}px">';
  const selectEndTagTemplate = '</select>';
  const optionTagTemplate = '<option value="{{value}}">{{title}}</option>';

  const newLine = '\r\n';

  const dataUrl = 'https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/ChatGptPromptSelector.data.json'
  const dataLoadErrorMessage = "ChatGPT Prompt Selector Error: Failed to download JSON dataset. Operation halted.";

  var items = null;

  function placeholder(name)
  {
    return '{{name}}'.replace('name', name);
  }

  function createDropdown(parent, name, defaultOptionTitle, widthInPixels, items)
  {
    var markup = selectStartTagTemplate.replace(placeholder('id'), name).replace(placeholder('width'), widthInPixels);

    markup += optionTagTemplate.replace(placeholder('value'), '').replace(placeholder('title'), defaultOptionTitle);

    for (const item of items)
    {
      const title = item.title;
      const mark = item.mark;
      markup += optionTagTemplate.replace(placeholder('value'), mark).replace(placeholder('title'), title);
    }

    markup += selectEndTagTemplate;

    parent.append(markup);
  }

  function lookupCategoryDropdown()
  {
    return $('#' + categoryDropdownName);
  }

  function lookupSubcategoryDropdown()
  {
    return $('#' + subcategoryDropdownName);
  }

  function onSubcategoryChange()
  {
    const categoryDropdown = lookupCategoryDropdown();
    const categoryMark = categoryDropdown.val();
    const categoryItem = items.find(i => i.mark === categoryMark);

    if (categoryItem == null)
      return;

    const subcategoryMark = $(this).val();
    const subcategoryItem = categoryItem.items.find(i => i.mark === subcategoryMark);

    if (subcategoryItem == null)
      return;

    var prompt = categoryItem.prompt.replace(placeholder('prompt'), subcategoryItem.prompt);
    const parts = prompt.split(newLine);
    const heightInPixels = defaultEntryHeightInPixels * parts.length + 1;

    var entry = $(entrySelectorQuery);
    var button = entry.next();

    entry.height(heightInPixels);
    entry.val(prompt);

    button.prop('disabled', false);
    button.click(() => {
      setTimeout(() => {
        entry.height(defaultEntryHeightInPixels);
      }, entryHeightResetDelayInMilliseconds);
    });
  }

  function onCategoryChange()
  {
    const categoryMark = $(this).val();

    console.log(categoryMark);

    const categoryItem = items.find(i => i.mark === categoryMark);
    if (categoryItem == null)
      return;

    var dropdown = lookupSubcategoryDropdown();
    if (dropdown.length > 0)
      dropdown.remove();

    const selector = lookupContainer();
    createDropdown(selector, subcategoryDropdownName, subcategoryDropdownPlaceholder, subcategoryDropdownWidthInPixels, categoryItem.items);

    dropdown = lookupSubcategoryDropdown();
    dropdown.change(onSubcategoryChange);
  }

  function lookupContainer()
  {
    return $(containerSelectorQuery);
  }

  function checkMarkup()
  {
    const selector = lookupContainer();

    if (selector.has('select').length > 0)
      return;

    createDropdown(selector, categoryDropdownName, categoryDropdownPlaceholder, categoryDropdownWidthInPixels, items);

    const categoryDropdown = lookupCategoryDropdown();
    categoryDropdown.change(onCategoryChange);
  }

  function activateCheckTimer()
  {
    setInterval(checkMarkup, checkMarkupPeriodInMilliseconds);
  }

  function assignReceivedData(jsonText)
  {
    items = JSON.parse(jsonText);
  }

  function loadData()
  {
    GM_xmlhttpRequest({
      method: "GET",
      url: dataUrl,
      onload: (response) => {
        assignReceivedData(response.responseText);
        activateCheckTimer();
      },
      onerror: () => {
        console.error(dataLoadErrorMessage);
      }
    });
  }

  loadData();
})();
