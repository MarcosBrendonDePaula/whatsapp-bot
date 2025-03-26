import basicCommands from './basic';
import utilitiesCommands from './utilities';
import { Commands } from '../types';

// Combinando todos os comandos em um único objeto
const allCommands: Commands = {
    ...basicCommands,
    ...utilitiesCommands
};

export default allCommands;