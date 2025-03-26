import basicCommands from './basic';
import utilitiesCommands from './utilities';
import adminCommands from './admin';
import { Commands } from '../types';
import { incrementCommandCount } from './admin';

// Combinando todos os comandos em um único objeto
const allCommands: Commands = {
    ...basicCommands,
    ...utilitiesCommands,
    ...adminCommands
};

// Wrapper para incrementar o contador de comandos executados
const wrapCommandsWithStats = (commands: Commands): Commands => {
    const wrappedCommands: Commands = {};
    
    for (const [name, handler] of Object.entries(commands)) {
        wrappedCommands[name] = async (params) => {
            // Incrementar contador de comandos
            incrementCommandCount();
            
            // Executar o comando original
            return handler(params);
        };
    }
    
    return wrappedCommands;
};

// Exportar comandos com estatísticas
export default wrapCommandsWithStats(allCommands);
