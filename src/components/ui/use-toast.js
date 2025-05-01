import { useCallback, useReducer } from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 3000 // Changed from 1000000 to 3000ms (3 seconds)

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
}

let count = 0

function generateId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const toastReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return [...state, action.toast].slice(-TOAST_LIMIT)
    
    case actionTypes.UPDATE_TOAST:
      return state.map((t) => 
        t.id === action.toast.id ? { ...t, ...action.toast } : t
      )
    
    case actionTypes.DISMISS_TOAST:
      return state.filter((t) => t.id !== action.toastId)
    
    case actionTypes.REMOVE_TOAST:
      return state.filter((t) => t.id !== action.toastId)
    
    default:
      return state
  }
}

const useToast = () => {
  const [toasts, dispatch] = useReducer(toastReducer, [])

  const toast = useCallback(({ ...props }) => {
    const id = generateId()

    const update = (props) =>
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...props, id }
      })

    const dismiss = () => dispatch({ 
      type: actionTypes.DISMISS_TOAST, 
      toastId: id 
    })

    dispatch({
      type: actionTypes.ADD_TOAST,
      toast: { ...props, id, dismiss }
    })

    setTimeout(() => {
      dispatch({ 
        type: actionTypes.REMOVE_TOAST, 
        toastId: id 
      })
    }, TOAST_REMOVE_DELAY)

    return {
      id,
      dismiss,
      update,
    }
  }, [])

  return {
    toast,
    toasts,
  }
}

export { useToast }