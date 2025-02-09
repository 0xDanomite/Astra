import { EventEmitter } from 'events';

// Create a singleton emitter for strategy updates
export const strategyEmitter = new EventEmitter();
