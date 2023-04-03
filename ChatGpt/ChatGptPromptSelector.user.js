// ==UserScript==
// @name         ChatGPT Prompt Selector
// @namespace    https://github.com/MJakubec/UserScripts
// @version      0.1
// @description  Allows to easily select a prompt from a prepared dataset.
// @author       Michal Jakubec
// @updateURL    https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/ChatGptPromptSelector.user.js
// @downloadURL  https://github.com/MJakubec/UserScripts/raw/main/ChatGpt/ChatGptPromptSelector.user.js
// @require      https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.6.4.min.js#sha256=a0fe8723dcf55da64d06b25446d0a8513e52527c45afcb37073465f9c6f352af
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.4/FileSaver.min.js#sha256=1433b8feb185bd8e81db7d2d1ea7330140531b72158300f8e26c98df1e853b21
// @match        https://chat.openai.com/chat
// @match        https://chat.openai.com/chat/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const categoryDropdownName = 'chatgpt-prompt-selector-category';
  const subcategoryDropdownName = 'chatgpt-prompt-selector-subcategory';
  const categoryDropdownPlaceholder = '[vyberte režim]';
  const subcategoryDropdownPlaceholder = '[vyberte téma]';

  const defaultEntryHeightInPixels = 24;

  const items = [
    {
      title: 'Hardware a sítě - zkoušení otázek',
      mark: 'HardwareAndNetworksTraining',
      prompt: 'Jsi mým zkoušejícím učitelem. V daném kroku mi položíš otázku, na kterou ti napíši odpověď, a ty mi řekneš, zda je má odpověď správná či chybná. V případě správné odpovědi zhodnotíš její úplnost. V případě chybné odpovědi zdůvodníš, proč je chybná, a vysvětlíš mi, jak měla být správně. Nakonec mi položíš další otázku. Téma zkoušení je: """\r\n{prompt}\r\n"""',
      items: [
        {
          title: '1. Charakteristika osobního počítače (PC)',
          mark: 'Question01',
          prompt: 'Charakteristika osobního počítače (PC)\r\n * základní pojmy - osobní počítač (PC), hardware, software, operační systém\r\n * počítačové skříně, napájecí zdroje\r\n * vnitřní součásti osobního počítače, vstupní a výstupní zařízení'
        },
        {
          title: '2. Hardware počítače',
          mark: 'Question02',
          prompt: 'Hardware počítače\r\n * základní deska, procesory a systém chlazení\r\n * paměti, druhy a použití\r\n * rozšiřující karty a sloty, porty\r\n * monitory – typy, funkce'
        },
        {
          title: '3. Notebooky a mobilní zařízení',
          mark: 'Question03',
          prompt: 'Notebooky a mobilní zařízení\r\n * základní charakteristika a druhy mobilních zařízení\r\n * nejběžnější komponenty notebooku a jejich funkce\r\n * specifické vlastnosti hardware do mobilních zařízení'
        },
        {
          title: '4. Tiskárny',
          mark: 'Question04',
          prompt: 'Tiskárny\r\n * základní typy tiskáren a jejich charakteristika\r\n * charakteristika rozhraní používaných pro připojení tiskáren\r\n * zásady výběru vhodné tiskárny na základě parametrů'
        },
        {
          title: '5. Základní pojmy počítačových sítí',
          mark: 'Question05',
          prompt: 'Základní pojmy počítačových sítí\r\n * účel počítačových sítí\r\n * typy sítí\r\n * prvky používané v počítačových sítích\r\n * trendy v oblasti počítačových sítí'
        },
        {
          title: '6. Síťové protokoly a komunikace v síti',
          mark: 'Question06',
          prompt: 'Síťové protokoly a komunikace v síti\r\n * princip přenosu dat v počítačové síti\r\n * komunikační protokoly a jejich funkce\r\n * síťové modely ISO/OSI a TCP/IP a jejich protokoly\r\n * standardizační organizace'
        },
        {
          title: '7. Fyzická a linková vrstva referenčního modelu OSI',
          mark: 'Question07',
          prompt: 'Fyzická a linková vrstva referenčního modelu OSI\r\n * účel, funkce, standardy\r\n * přenosové cesty, druhy spojů (linky)\r\n * fyzická a logická topologie sítě LAN a WAN\r\n * přístupové metody v LAN a WLAN'
        },
        {
          title: '8. Ethernet',
          mark: 'Question08',
          prompt: 'Ethernet\r\n * charakteristika Ethernetu, rámec Ethernetu\r\n * MAC adresy - formát, druhy\r\n * ARP\r\n * switch - základní principy, metody předávání rámců'
        },
        {
          title: '9. Síťová vrstva referenčního modelu OSI',
          mark: 'Question09',
          prompt: 'Síťová vrstva referenčního modelu OSI\r\n * účel, funkce síťové vrstvy\r\n * protokoly síťové vrstvy a jejich datové jednotky\r\n * princip paketového přenosu dat'
        },
        {
          title: '10. Protokoly transportní vrstvy',
          mark: 'Question10',
          prompt: 'Protokoly transportní vrstvy\r\n * účel, funkce transportní vrstvy, protokoly transportní vrstvy\r\n * porty aplikací\r\n * 3-way handshake a ukončení spojení'
        },
        {
          title: '11. Protokoly aplikační vrstvy',
          mark: 'Question11',
          prompt: 'Protokoly aplikační vrstvy\r\n * účel, funkce a charakteristika protokolů aplikační vrstvy\r\n * přehled protokolů aplikační vrstvy\r\n * výběr transportního protokolu pro aplikace'
        },
        {
          title: '12. IP adresace a subnetace',
          mark: 'Question12',
          prompt: 'IP adresace a subnetace\r\n * účel IP adresace, zápis, struktura a druhy IPv4 adres\r\n * IPv6 - důvody vzniku, zápis, struktura a druhy IPv6 adres\r\n * subnetace, VLSM'
        },
        {
          title: '13. Protokol DHCP',
          mark: 'Question13',
          prompt: 'Protokol DHCP\r\n * význam služby DHCP\r\n * průběh komunikace v DHCPv4\r\n * průběh komunikace v DHCPv6'
        },
        {
          title: '14. Bezpečnost v sítích LAN',
          mark: 'Question14',
          prompt: 'Bezpečnost v sítích LAN\r\n * druhy útoků v LAN\r\n * druhy útoků na L2, možnosti předcházení útokům na LAN\r\n * zabezpečení přístupu na switche a routery'
        },
        {
          title: '15. Přepínané sítě',
          mark: 'Question15',
          prompt: 'Přepínané sítě\r\n * přepínání rámců na switchi, popis, metody\r\n * virtuální sítě (VLAN) na switchích, - vlastnosti a realizace\r\n * princip redundantního návrhu sítí LAN'
        },
        {
          title: '16. Routing, Inter-VLAN routing',
          mark: 'Question16',
          prompt: 'Routing, Inter-VLAN routing\r\n * princip routingu\r\n * typy routovacích protokolů, routovací tabulky\r\n * Inter-VLAN routing, varianty Inter-VLAN routingu'
        },
        {
          title: '17. Statický routing',
          mark: 'Question17',
          prompt: 'Statický routing\r\n * charakteristika, podstata a možnosti použití statického routingu\r\n * konfigurace statického routingu\r\n * CIDR a VLSM'
        },
        {
          title: '18. Dynamický routing',
          mark: 'Question18',
          prompt: 'Dynamický routing\r\n * charakteristika dynamických routovacích protokolů\r\n * OSPF - druhy, vlastnosti a možnosti nasazení\r\n * OSPF pakety, OSPF konfigurace'
        },
        {
          title: '19. Access Control Lists (ACL)',
          mark: 'Question19',
          prompt: 'Access Control Lists (ACL)\r\n * účel a charakteristika ACL\r\n * standardní a rozšířené IPv4 ACL\r\n * ACL v IPv6'
        },
        {
          title: '20. Služba NAT v IPv4',
          mark: 'Question20',
          prompt: 'Služba NAT v IPv4\r\n * význam služby NAT v IPv4 a její varianty\r\n * konfigurace služby NAT a PAT\r\n * port-forwarding - charakteristika a konfigurace'
        },
        {
          title: '21. Správa VLAN ve středně velkých a velkých sítích',
          mark: 'Question21',
          prompt: 'Správa VLAN ve středně velkých a velkých sítích\r\n * princip hierarchického návrhu sítě a jeho vlastnosti\r\n * správa VLAN na Cisco switchích\r\n * protokol DTP a jeho dopady na bezpečnost sítě\r\n * Layer 3 Switching - vlastnosti a způsoby nasazení'
        },
        {
          title: '22. Protokol STP a EtherChannel',
          mark: 'Question22',
          prompt: 'Protokol STP a EtherChannel\r\n * pojem redundantní síť a možné problémy v ní\r\n * koncepce a použití STP, druhy STP protokolů\r\n * EtherChannel - popis a využití'
        },
        {
          title: '23. Bezdrátové sítě, standardy bezdrátových sítí',
          mark: 'Question23',
          prompt: 'Bezdrátové sítě, standardy bezdrátových sítí\r\n * současné technologie bezdrátových sítí\r\n * přístupová metoda CSMA/CA v bezdrátových sítích\r\n * standardy bezdrátových sítí (802.11)'
        },
        {
          title: '24. Standardy a technologie sítí WAN',
          mark: 'Question24',
          prompt: 'Standardy a technologie sítí WAN\r\n * sítě WAN - definice, účel, topologie a vlastnosti\r\n * základní pojmy a zařízení používaná v sítích WAN\r\n * přehled a základní charakteristika technologií sítí WAN'
        },
        {
          title: '25. VPN a IPsec',
          mark: 'Question25',
          prompt: 'VPN a IPsec\r\n * účel a výhody použití VPN\r\n * typy VPN\r\n * IPsec - charakteristika'
        }
      ]
    }
  ];

  function createDropdown(container, name, placeholder, items)
  {
    var markup = '<select id="{name}">'.replace('{name}', name);

    markup += '<option value="">{placeholder}</option>'.replace('{placeholder}', placeholder);

    for (const item of items)
    {
      const title = item.title;
      const mark = item.mark;
      markup += '<option value="{mark}">{title}</option>'.replace('{mark}', mark).replace('{title}', title);
    }

    markup += '</select>';

    container.append(markup);
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
    var prompt = categoryItem.prompt.replace("{prompt}", subcategoryItem.prompt);
    const parts = prompt.split(/\r\n/);
    const heightInPixels = defaultEntryHeightInPixels * parts.length + 1;
    var entry = $('textarea');
    var button = entry.next();
    entry.height(heightInPixels);
    entry.val(prompt);
    button.prop('disabled', false);
    button.click(() => {
      console.log('Button clicked');
      setTimeout(() => {
        entry.height(defaultEntryHeightInPixels);
      }, 500);
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
    createDropdown(selector, subcategoryDropdownName, subcategoryDropdownPlaceholder, categoryItem.items);

    dropdown = lookupSubcategoryDropdown();
    dropdown.change(onSubcategoryChange);
  }

  function lookupContainer()
  {
    return $('form div.md\\:w-full.justify-center');
  }

  function checkMarkup()
  {
    console.log('checkMarkup called');

    const selector = lookupContainer();

    if (selector.has('select').length > 0)
      return;

    createDropdown(selector, categoryDropdownName, categoryDropdownPlaceholder, items);

    const categoryDropdown = lookupCategoryDropdown();
    categoryDropdown.change(onCategoryChange);
  }

  setInterval(checkMarkup, 500);
})();