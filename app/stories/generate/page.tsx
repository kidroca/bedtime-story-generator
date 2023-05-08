import Image from 'next/image';
import styles from './page.module.css';
import CreateStory from '@/components/CreateStory';
import Providers from '@/components/Providers';

export default function Home() {
  return (
    <main className={styles.main}>
      <h2>Story Generator</h2>

      <Providers>
        <CreateStory />
      </Providers>
    </main>
  )
}
