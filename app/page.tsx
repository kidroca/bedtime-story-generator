import Image from 'next/image'
import styles from './page.module.css'
import InputForm from '@/components/InputForm';

export default function Home() {
  return (
    <main className={styles.main}>
      <Image src="/dog.png" className={styles.icon} width={34} height={34} alt="Dog Icon" />
      <h3>Chat with me (I am a person)</h3>

      <InputForm />
    </main>
  )
}
