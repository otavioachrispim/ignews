import styles from './styles.module.scss'
import { signIn, useSession, signOut } from 'next-auth/client'

import { FaGithub } from 'react-icons/fa'
import { FiX } from 'react-icons/fi'

export function SignInButton(){
  /*useSession é um recurso do next utilizado pra ver se o usuario esta logado ou nao*/
  const [session] = useSession()
  
  return session ? (
    <button 
      type="button"
      className={styles.signinButton}
      onClick={() => signOut()}
    >
      <FaGithub color="#04d361"/>
      {session.user.name}
      <FiX color="#737390" className={styles.closeIcon}/>
    </button>
  ) : (
    <button 
      type="button"
      className={styles.signinButton}
      /*signIn é utilizado para o usuario logar*/
      onClick={() => signIn('github')}
    >
      <FaGithub color="#eba417"/>
      Sign in with Github
    </button>
  )
}