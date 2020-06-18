import {browser} from 'webextension-polyfill-ts'
import {Feature, Settings} from '../settings'
import {RoamDate} from '../roam/date'

export const config: Feature = { // An object that describes new feature we introduce
    id: 'reference-sorting',  // Feature id - any unique string would do
    name: 'Reference Sorting',  // Feature name - would be displayed in the settings menu
    warning: 'Experimental feature',
    enabledByDefault: false,
}

const debug = true;



// TODO: need to refactor out the DOM Observer logic waiting for the Reference container to render before starting execution
const observer = new MutationObserver(() => {
    // TODO: find a better an more reliable selector to check for
    if(document.querySelectorAll('.rm-reference-container > .flex-h-box').length) {
        checkSettingsAndSetupButtons();
        observer.disconnect();
    }
})
  
observer.observe(document.body, { 
    childList: true,
    subtree: true
});



const checkSettingsAndSetupButtons = () => {
    Settings.isActive(config.id).then(() => {
        addSortingButtons()
    })
}

browser.runtime.onMessage.addListener(async message => {
    if (message === 'settings-updated') {
        checkSettingsAndSetupButtons()
    }
})


const addSortingButtons = () => {
    if(debug)
        console.log('addSortingButtons');

    createButtonElement('bp3-icon-sort-alphabetical', 'alphabetical')
    createButtonElement('bp3-icon-sort-asc', 'daily')
}

const createSpan = (classes: Array) => {
    const element = document.createElement('span')
    element.classList.add(...classes)
    
    return element
}

// Sorting button HTML (Blueprint 3):
// <span class="bp3-button bp3-minimal bp3-small rr-sort" tabindex="0">
//   <span class="bp3-icon bp3-icon-sort-alphabetical" id="alphabetical">/span>
// </span>

const createButtonElement = (icon: string, elementId: string) => {
    const buttonContainerClasses = ['bp3-button', 'bp3-minimal', 'bp3-small', 'rr-sort']

    const buttonContainer = createSpan(buttonContainerClasses);
    buttonContainer.tabIndex = 0
    
    const buttonInnerElement = createSpan(['bp3-icon', icon])
    buttonInnerElement.id = elementId

    buttonContainer.appendChild(buttonInnerElement)

    document.querySelectorAll('.rm-reference-container > .flex-h-box').forEach(element => {
        element.appendChild(buttonContainer)
    })

    buttonContainer.addEventListener('click', (event: MouseEvent) => {
        if(debug) {
            console.log('click event received', event)
        }

        const referencesList = buttonContainer.parentNode?.nextSibling;
        if(!referencesList) {
            console.error('something went really wrong ...')
            return;
        }
        
        const references = referencesList?.querySelectorAll(':scope > .rm-ref-page-view');

        // Remove reference elements from DOM
        // references.forEach(element => referencesList?.removeChild(element))
        
        Array.from(references)
            .sort((a, b) => {
                // TODO: find a cleaner way to do this
                const elementAText = a.querySelector(':scope .rm-ref-page-view-title a span').textContent
                const elementBText = b.querySelector(':scope .rm-ref-page-view-title a span').textContent
                
                if(debug){
                    console.log('a', elementAText, nameIsDate(elementAText))
                    console.log('b', elementBText, nameIsDate(elementBText))
                }

                if (elementId == "alphabetical" || (!nameIsDate(elementAText) && !nameIsDate(elementBText)))
                    return elementAText.localeCompare(elementBText)

                if(nameIsDate(elementAText) && !nameIsDate(elementBText))
                    return (elementId === "daily") ? -1 : 1;
                
                if(!nameIsDate(elementAText) && nameIsDate(elementBText))
                    return (elementId === "daily") ? 1 : -1;

                return RoamDate.parseFromReference(elementAText) - RoamDate.parseFromReference(elementBText)
            })
            .forEach(node => referencesList.appendChild(node))
    })
}

// TODO: move Roam Date helper function to RoamDate.ts file
const nameIsDate = (pageName: string): boolean => pageName.match(/(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(st|nd|th|rd), \d{4}/gm) !== null