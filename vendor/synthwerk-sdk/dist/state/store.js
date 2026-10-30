// A minimal external store: an immutable snapshot and listeners. React reads it with
// useSyncExternalStore, Vue with a shallowRef. Each change makes a new snapshot object.
export function createStore(initial) {
    let snapshot = initial;
    const listeners = new Set();
    function set(next) {
        if (next === snapshot)
            return;
        snapshot = next;
        for (const listener of [...listeners])
            listener();
    }
    return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        set,
        update: (patch) => set({ ...snapshot, ...patch })
    };
}
