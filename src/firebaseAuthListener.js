import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { setUser, clearUser } from "./redux/slices/authSlice";

export const listenForAuthChanges = (dispatch) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      dispatch(
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
        })
      );
    } else {
      dispatch(clearUser());
    }
  });
};
