import Image from 'next/image'
import styles from './page.module.css'
import CreateStory from '@/components/CreateStory';
import Providers from '@/components/Providers';

export default function Home() {
  return (
    <main className={styles.main}>
      <Image src="/dog.png" className={styles.icon} width={34} height={34} alt="Dog Icon" />
      <h2>Каква приказка желаете да ви разкажа</h2>

      <Providers>
        <CreateStory />
      </Providers>
    </main>
  )
}
