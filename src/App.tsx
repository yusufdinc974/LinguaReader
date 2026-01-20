import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import HomePage from './pages/HomePage'
import PdfReader from './pages/PdfReader'
import WordLists from './pages/WordLists'
import Quiz from './pages/Quiz'
import Stats from './pages/Stats'

function App() {
    return (
        <div className="h-full flex">
            <Navigation />
            <main className="flex-1 overflow-auto">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/reader" element={<PdfReader />} />
                    <Route path="/wordlists" element={<WordLists />} />
                    <Route path="/quiz" element={<Quiz />} />
                    <Route path="/stats" element={<Stats />} />
                </Routes>
            </main>
        </div>
    )
}

export default App
