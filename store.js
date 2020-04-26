class Store {
  constructor(backend) {
    this.backend = backend;
  }

  get(args) {
    return this.backend.get(args);
  }

  set(args) {
    return this.backend.set(args);
  }
}

window.Store = Store;
