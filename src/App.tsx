import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import UpdateNotification from './components/UpdateNotification'
import HomePage from './pages/HomePage'
import PdfReader from './pages/PdfReader'
import WordLists from './pages/WordLists'
import Quiz from './pages/Quiz'
import Stats from './pages/Stats'

function App() {
    return (
        <div className="h-full flex overflow-hidden">
            <Navigation />
            <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-auto">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/reader" element={<PdfReader />} />
                        <Route path="/wordlists" element={<WordLists />} />
                        <Route path="/quiz" element={<Quiz />} />
                        <Route path="/stats" element={<Stats />} />
                    </Routes>
                </div>
            </main>
            <UpdateNotification />
        </div>
    )
}

export default App
