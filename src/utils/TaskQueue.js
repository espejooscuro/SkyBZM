const fs = require('fs');
const path = require('path');

class TaskQueue {
  constructor(onSaveState = null) {
    this.queue = [];
    this.running = false;
    this.currentTask = null; // Nodo actual en ejecución
    this.paused = false; // Control de pausa manual
    this.onSaveState = onSaveState; // Callback para guardar estado (proporcionado por FlipManager)
  }

  // Encolar una tarea con metadata para saber qué nodo es
  enqueue(task, metadata = {}) {
    return new Promise((resolve, reject) => {
      const taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const job = async () => {
        if (this.paused) {
          console.log(`[TaskQueue] Queue is paused, waiting...`);
          return; // No ejecutar si está pausado
        }
        
        try {
          // Guardar el nodo actual ANTES de ejecutar
          this.currentTask = { id: taskId, metadata, startTime: Date.now() };
          this.saveState();
          
          console.log(`[TaskQueue] Executing node: ${metadata.type || 'unknown'} for ${metadata.item || 'unknown'}`);
          
          await task();
          
          // Limpiar nodo actual después de completar
          this.currentTask = null;
          this.saveState();
          resolve();
        } catch (err) {
          console.error(`[TaskQueue] Error in task ${taskId}:`, err.message);
          this.currentTask = null;
          this.saveState();
          reject(err);
        }
      };
      
      // Agregar a la cola con metadata
      this.queue.push({ id: taskId, job, metadata });
      this.saveState();
      this.run();
    });
  }

  async run() {
    if (this.running || this.paused) return;
    this.running = true;
    
    while (this.queue.length && !this.paused) {
      const taskWrapper = this.queue.shift();
      this.saveState(); // Guardar después de remover de la cola
      await taskWrapper.job();
    }
    
    this.running = false;
    this.saveState();
  }

  // Guardar estado usando callback
  saveState() {
    if (typeof this.onSaveState === 'function') {
      const state = {
        queueLength: this.queue.length,
        running: this.running,
        paused: this.paused,
        currentTask: this.currentTask, // El nodo que se está ejecutando ahora
        queuedTasks: this.queue.map(t => ({
          id: t.id,
          metadata: t.metadata
        })),
        timestamp: Date.now()
      };
      
      this.onSaveState(state);
    }
  }

  // Obtener estado actual
  getState() {
    return {
      queueLength: this.queue.length,
      running: this.running,
      paused: this.paused,
      currentTask: this.currentTask,
      queuedTasks: this.queue.map(t => ({
        id: t.id,
        metadata: t.metadata
      }))
    };
  }

  // Pausar la cola (detener procesamiento)
  pause() {
    console.log(`[TaskQueue] Pausing queue...`);
    this.paused = true;
    this.saveState();
  }

  // Reanudar la cola
  resume() {
    console.log(`[TaskQueue] Resuming queue...`);
    this.paused = false;
    this.saveState();
    
    if (!this.running && this.queue.length > 0) {
      this.run();
    }
  }

  // Limpiar cola (útil al detener el bot completamente)
  clear() {
    console.log(`[TaskQueue] Clearing queue...`);
    this.queue = [];
    this.currentTask = null;
    this.saveState();
  }

  // Verificar si hay un nodo guardado para reanudar
  hasStateToResume(savedState) {
    return savedState && (savedState.currentTask || savedState.queueLength > 0);
  }
}

module.exports = TaskQueue;

