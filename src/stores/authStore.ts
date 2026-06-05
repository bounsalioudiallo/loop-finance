import { computed, reactive, watch } from 'vue';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/services/firebase';

interface AuthState {
  isAuthenticated: boolean;
  uid: string;
  displayName: string;
  email: string;
}

const storageKey = 'loop-auth-state-v1';

const defaultState: AuthState = {
  isAuthenticated: false,
  uid: '',
  displayName: '',
  email: '',
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  return saved ? ({ ...defaultState, ...JSON.parse(saved) } as AuthState) : { ...defaultState };
}

const state = reactive<AuthState>(loadState());
let authReady = false;

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

  async function signIn(input: { displayName: string; email: string; password: string }) {
    const email = input.email.trim();
    const password = input.password;

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      state.uid = credential.user.uid;
      state.displayName = credential.user.displayName || input.displayName.trim() || email.split('@')[0] || 'Loop user';
      state.email = credential.user.email || email;
      state.isAuthenticated = true;
    } catch {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      state.uid = credential.user.uid;
      state.displayName = credential.user.displayName || input.displayName.trim() || email.split('@')[0] || 'Loop user';
      state.email = credential.user.email || email;
      state.isAuthenticated = true;
    }
  }

  async function signInWithGoogle() {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    state.uid = credential.user.uid;
    state.displayName = credential.user.displayName || credential.user.email?.split('@')[0] || 'Loop user';
    state.email = credential.user.email || '';
    state.isAuthenticated = true;
  }

  async function signOut() {
    await firebaseSignOut(auth);
    Object.assign(state, defaultState);
  }

  if (!authReady) {
    authReady = true;
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        Object.assign(state, defaultState);
        return;
      }

      state.uid = user.uid;
      state.displayName = user.displayName || user.email?.split('@')[0] || 'Loop user';
      state.email = user.email || '';
      state.isAuthenticated = true;
    });
  }

  return {
    state,
    initials,
    signIn,
    signInWithGoogle,
    signOut,
  };
}
