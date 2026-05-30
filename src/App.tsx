import { Hero } from './components/Hero';
import { Timeline } from './components/Timeline';
import { ExpenseTracker } from './components/ExpenseTracker';

export default function App() {
  return (
    <>
      <Hero />
      <div className="wrap">
        <Timeline />
        <ExpenseTracker />
        <footer className="foot">
          <div className="om2">ॐ</div>
          Subramanya Subramanya · Safe travels &amp; blessed darshan
        </footer>
      </div>
    </>
  );
}
