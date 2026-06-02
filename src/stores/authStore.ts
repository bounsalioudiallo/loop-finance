import { computed, reactive, watch } from 'vue';

interface AuthState {
  isAuthenticated: boolean;
  displayName: string;
  email: string;
}

const storageKey = 'loop-auth-state-v1';

const defaultState: AuthState = {
  isAuthenticated: false,
  displayName: '',
  email: '',
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  return saved ? ({ ...defaultState, ...JSON.parse(saved) } as AuthState) : { ...defaultState };
}

const state = reactive<AuthState>(loadState());

watch(
  state,
  (nextState) => {
    localStorage.setItem(storageKey, JSON.stringify(nextState));
  },
  { deep: true },
);

export function useAuthStore() {
  const initials = computed(() => {
    if (state.displayName.trim()) {
      return state.displayName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }

    return state.email.slice(0, 2).toUpperCase() || 'LF';
  });

  function signIn(input: { displayName: string; email: string }) {
    state.displayName = input.displayName.trim() || input.email.split('@')[0] || 'Loop user';
    state.email = input.email.trim();
    state.isAuthenticated = true;
  }

  function signOut() {
    Object.assign(state, defaultState);
  }

  return {
    state,
    initials,
    signIn,
    signOut,
  };
}
