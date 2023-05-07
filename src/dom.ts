import { GameState } from './types';
import { isCountryCorrect } from './util';

function getElementById<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const targetCountryElement = getElementById('target-country');

export function setTargetCountryName(name: string) {
  targetCountryElement.textContent = `Where is ${name}?`;
}

export function startTargetCountryAnimation() {
  targetCountryElement.style.animationPlayState = 'running';
}

// https://stackoverflow.com/questions/13698975/click-link-inside-leaflet-popup-and-do-javascript
export const confirmGuessButton = document.createElement('button');
confirmGuessButton.id = 'confirm-guess';
confirmGuessButton.textContent = 'Confirm ✅';

const resultDialog = getElementById<HTMLDialogElement>('result-dialog');
const resultTitle = getElementById('result-title');
const resultDetail = getElementById('result-detail');
export const seeAnswerButton = getElementById('see-answer');
export const playAgainButton = getElementById('play-again');

export function showResultDialog(gameState: GameState) {
  if (gameState.selectedCountry && gameState.targetCountry) {
    if (isCountryCorrect(gameState.selectedCountry, gameState)) {
      resultTitle.className = 'success';
      resultTitle.textContent = 'Correct!';
      setHidden(resultDetail);
      setHidden(seeAnswerButton);
    } else {
      resultTitle.className = 'error';
      resultTitle.textContent = 'Incorrect';
      resultDetail.textContent = `You selected ${gameState.selectedCountry.properties.name}`;
      setHidden(resultDetail, false);
      setHidden(seeAnswerButton, false);
    }
    resultDialog.show();
  }
}

export function closeResultDialog() {
  resultDialog.close();
}

function setHidden(element: HTMLElement, hidden = true) {
  if (hidden) {
    element.classList.add('hidden');
  } else {
    element.classList.remove('hidden');
  }
}
