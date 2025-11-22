import React, { useState, useEffect, useContext } from 'react'
import { motion } from 'framer-motion'
import { FaCalendarAlt, FaMapMarkerAlt, FaClock, FaExternalLinkAlt, FaUsers, FaGlobe } from 'react-icons/fa'
import { Context } from './context'
import { seminarOperations } from '../utils/fileOperations'
import './styles/seminars.css'

export default function Seminars() {
    const { role } = useContext(Context)
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [upcomingSortOrder, setUpcomingSortOrder] = useState('earliest') // 'earliest' or 'latest'

    useEffect(() => {
        loadSeminars()
    }, [])

    async function loadSeminars() {
        setLoading(true)
        try {
            const seminars = await seminarOperations.getSeminars()
            
            // Transform database format to component format
            const transformedEvents = seminars.map(seminar => {
                // Determine status based on date
                const seminarDate = new Date(seminar.date)
                const today = new Date()
                
                // Reset time to midnight for accurate date comparison
                seminarDate.setHours(0, 0, 0, 0)
                today.setHours(0, 0, 0, 0)
                
                let status
                if (seminarDate.getTime() === today.getTime()) {
                    status = 'ongoing' // Event is today
                } else if (seminarDate < today) {
                    status = 'past' // Event was before today
                } else {
                    status = 'upcoming' // Event is in the future
                }
                
                return {
                    id: seminar.id,
                    title: seminar.type || 'Événement',
                    description: seminar.description || 'Aucune description disponible',
                    date: seminar.date,
                    time: seminar.time || 'Heure non spécifiée',
                    location: seminar.location || 'Lieu non spécifié',
                    type: seminar.type?.toLowerCase() || 'seminar',
                    link: seminar.link || '#',
                    capacity: seminar.spots || 0,
                    status: status
                }
            })
            
            // Sort by date from latest to earliest
            transformedEvents.sort((a, b) => new Date(b.date) - new Date(a.date))
            
            setEvents(transformedEvents)
        } catch (error) {
            console.error('Error loading seminars:', error)
            setEvents([])
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getEventTypeLabel = (type) => {
        const types = {
            conference: 'Conférence',
            seminar: 'Séminaire',
            workshop: 'Atelier'
        }
        return types[type] || type
    }

    const getEventTypeClass = (type) => {
        return `event-type-${type}`
    }

    const upcomingEvents = events.filter(e => e.status === 'upcoming')
    const ongoingEvents = events.filter(e => e.status === 'ongoing')
    const pastEvents = events.filter(e => e.status === 'past')

    // Sort upcoming events based on selected order
    const sortedUpcomingEvents = [...upcomingEvents].sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        
        if (upcomingSortOrder === 'earliest') {
            return dateA - dateB // Earliest first
        } else {
            return dateB - dateA // Latest first
        }
    })

    return (
        <motion.div 
            className="seminars-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut'}}
        >
            <section className="seminars-hero">
                <div className="seminars-hero-content">
                    <h1>Séminaires & Conférences</h1>
                    <p>Découvrez nos événements académiques, conférences et ateliers</p>
                </div>
            </section>

            <section className="seminars-content">
                {loading ? (
                    <div className="seminars-loading">
                        <div className="loading-spinner"></div>
                        <p>Chargement des événements...</p>
                    </div>
                ) : (
                    <>
                        {ongoingEvents.length > 0 && (
                            <div className="events-section">
                                <h2 className="section-title">Événements en cours</h2>
                                <div className="events-grid">
                                    {ongoingEvents.map(event => (
                                        <div key={event.id} className="event-card ongoing-event">
                                            <div className="event-header">
                                                <span className={`event-type ${getEventTypeClass(event.type)}`}>
                                                    {getEventTypeLabel(event.type)}
                                                </span>
                                                <span className="event-status ongoing">En cours</span>
                                            </div>
                                            
                                            <h3 className="event-title">{event.title}</h3>
                                            <p className="event-description">{event.description}</p>
                                            
                                            <div className="event-details">
                                                <div className="event-detail">
                                                    <FaCalendarAlt />
                                                    <span>{formatDate(event.date)}</span>
                                                </div>
                                                <div className="event-detail">
                                                    <FaClock />
                                                    <span>{event.time}</span>
                                                </div>
                                                <div className="event-detail">
                                                    <FaMapMarkerAlt />
                                                    <span>{event.location}</span>
                                                </div>
                                                <div className="event-detail">
                                                    <FaUsers />
                                                    <span>{event.capacity} places</span>
                                                </div>
                                            </div>
                                            
                                            <a 
                                                href={event.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="event-link"
                                            >
                                                <FaGlobe />
                                                En savoir plus
                                                <FaExternalLinkAlt />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {upcomingEvents.length > 0 && (
                            <div className="events-section">
                                <div className="section-header">
                                    <h2 className="section-title">Événements à venir</h2>
                                    <div className="sort-controls">
                                        <label htmlFor="upcoming-sort">Trier par :</label>
                                        <select 
                                            id="upcoming-sort"
                                            value={upcomingSortOrder}
                                            onChange={(e) => setUpcomingSortOrder(e.target.value)}
                                            className="sort-select"
                                        >
                                            <option value="earliest">Du plus proche au plus lointain</option>
                                            <option value="latest">Du plus lointain au plus proche</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="events-grid">
                                    {sortedUpcomingEvents.map(event => (
                                        <div key={event.id} className="event-card">
                                            <div className="event-header">
                                                <span className={`event-type ${getEventTypeClass(event.type)}`}>
                                                    {getEventTypeLabel(event.type)}
                                                </span>
                                                <span className="event-status upcoming">À venir</span>
                                            </div>
                                            
                                            <h3 className="event-title">{event.title}</h3>
                                            <p className="event-description">{event.description}</p>
                                            
                                            <div className="event-details">
                                                <div className="event-detail">
                                                    <FaCalendarAlt />
                                                    <span>{formatDate(event.date)}</span>
                                                </div>
                                                <div className="event-detail">
                                                    <FaClock />
                                                    <span>{event.time}</span>
                                                </div>
                                                <div className="event-detail">
                                                    <FaMapMarkerAlt />
                                                    <span>{event.location}</span>
                                                </div>
                                                <div className="event-detail">
                                                    <FaUsers />
                                                    <span>{event.capacity} places</span>
                                                </div>
                                            </div>
                                            
                                            <a 
                                                href={event.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="event-link"
                                            >
                                                <FaGlobe />
                                                En savoir plus
                                                <FaExternalLinkAlt />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {pastEvents.length > 0 && (
                            <div className="events-section">
                                <h2 className="section-title">Événements passés</h2>
                                <div className="events-grid">
                                    {pastEvents.map(event => (
                                        <div key={event.id} className="event-card past-event">
                                            <div className="event-header">
                                                <span className={`event-type ${getEventTypeClass(event.type)}`}>
                                                    {getEventTypeLabel(event.type)}
                                                </span>
                                                <span className="event-status past">Terminé</span>
                                            </div>
                                            
                                            <h3 className="event-title">{event.title}</h3>
                                            <p className="event-description">{event.description}</p>
                                            
                                            <div className="event-details">
                                                <div className="event-detail">
                                                    <FaCalendarAlt />
                                                    <span>{formatDate(event.date)}</span>
                                                </div>
                                                <div className="event-detail">
                                                    <FaMapMarkerAlt />
                                                    <span>{event.location}</span>
                                                </div>
                                            </div>
                                            
                                            <a 
                                                href={event.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="event-link"
                                            >
                                                <FaGlobe />
                                                Voir les détails
                                                <FaExternalLinkAlt />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {events.length === 0 && (
                            <div className="no-events">
                                <FaCalendarAlt />
                                <h3>Aucun événement disponible</h3>
                                <p>Les prochains événements seront annoncés bientôt</p>
                            </div>
                        )}
                    </>
                )}
            </section>
        </motion.div>
    )
}
