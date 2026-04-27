import { useEffect, useRef } from 'react'
import { playSoftUiClick } from '@/lib/uiSound'

/** Son discret à l’ouverture d’une modale tactique */
export const useModalOpenSound = (isOpen: boolean) => {
  const wasOpen = useRef(false)
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      playSoftUiClick()
    }
    wasOpen.current = isOpen
  }, [isOpen])
}
