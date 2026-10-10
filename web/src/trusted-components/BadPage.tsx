import { Link, useNavigate } from 'react-router-dom'
import { PageMetadata } from '../components/PageMetadata'
import mascotMap from '../assets/images/mascot-map.png'
import './BadPage.css'

export function BadPage() {
    const navigate = useNavigate()

    function goBack() {
        // Only go back when React Router has a prior app entry. A directly opened
        // missing URL should still provide a useful destination.
        if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) {
            void navigate(-1)
        } else {
            void navigate('/', { replace: true })
        }
    }

    return (
        <div className="not-found-page">
            <PageMetadata
                title="Page not found"
                description="We couldn’t find that page. Find your way back to Ombuddi."
            />
            <header className="not-found-header">
                <Link
                    to="/"
                    aria-label="Ombuddi home"
                >
                    ombuddi
                </Link>
            </header>
            <main
                className="not-found-content"
                aria-labelledby="not-found-title"
            >
                <h1
                    id="not-found-title"
                    className="not-found-code"
                >
                    <span className="not-found-sr-only">Page not found: </span>404
                </h1>
                <img
                    className="not-found-mascot"
                    src={mascotMap}
                    width="1280"
                    height="1280"
                    alt="The Ombuddi monster puzzling over a map."
                />
                <h2>A little off the map.</h2>
                <p>We couldn’t find that page.</p>
                <div className="not-found-actions">
                    <Link
                        className="not-found-home"
                        to="/"
                    >
                        Back to home
                    </Link>
                    <button
                        className="not-found-back"
                        type="button"
                        onClick={goBack}
                    >
                        Go back
                    </button>
                </div>
            </main>
        </div>
    )
}
