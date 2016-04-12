import {STIB_STOPS} from './data.js'
import getColor from './colors.js'
import GreatCircle from 'great-circle'
import L from 'leaflet'
import {t2s, s2t} from './utils.js'

// If stop is defined, return stop, otherwise get stop object from
// STIB_STOPS given its id.
function getStop(stop_id, stop){
    if (stop !== undefined){
        return stop
    }
    return STIB_STOPS[`${stop_id}`.rjust(4, '0')]
}

function pluralize(n, singular, plural){
    if (Math.abs(n) > 1){
        return plural
    }
    return singular
}

function pluralizeMinutes(seconds){
    let m = Math.round(seconds/60, 1)
    return `${m} ${pluralize(m, 'minute', 'minutes')}`
}

function pluralizeVehicles(n){
    let v = Math.round(n)
    return `${v} ${pluralize(v, 'vehicle', 'vehicles')}`
}

function icon(name){
    return `<span class="glyphicon glyphicon-${name}"></span>`
}

// A Leg is a link between 2 stops. A Line is made of consecutive legs,
// but a leg could belong to multiple lines
export default class Leg {
    static metrics(){
        return [
            'count',    // Total number of vehicles in time frame
            'per_hour', // Number of vehicles per hour
            'min_time', // Minimum travel time
            'avg_time', // Average travel time
            'max_time', // Maximum travel time
            'lines',    // All the lines that pass by this stop
        ]
    }

    constructor(data){
        this.fromStop = getStop(data.from_stop_id, data.fromStop)
        this.toStop = getStop(data.to_stop_id, data.toStop)
        for (let k of Leg.metrics()){
            this[k] = data[k]
        }
    }

    distance(){
        return GreatCircle.distance(
            this.fromStop.latitude, this.fromStop.longitude,
            this.toStop.latitude, this.toStop.longitude
        )
    }

    isClean(){
        return (this.fromStop != undefined) && (this.toStop != undefined)
    }

    latLng(){
        return [
            L.latLng(this.fromStop.latitude, this.fromStop.longitude),
            L.latLng(this.toStop.latitude, this.toStop.longitude)
        ]
    }

    popupContent(){
        return `<h4>
                    ${this.fromStop.name} ${icon('arrow-right')} ${this.toStop.name}
                    <small>${Math.round(100*this.distance())/100} km</small>
                </h4>
                <h5>${icon('road')} Lines <small>${this.lines.join(', ')}</small></h5>
                <h5>${icon('stats')} Frequency</h5>
                <ul>
                    <li>${pluralizeVehicles(this.count)} in time frame</li>
                    <li>${pluralizeVehicles(this.per_hour)} per hour in average</li>
                </ul>
                <h5>${icon('time')} Travel time</h5>
                <ul>
                    <li>${pluralizeMinutes(this.min_time)} to ${pluralizeMinutes(this.max_time)}</li>
                    <li>${pluralizeMinutes(this.avg_time)} in average</li>
                </ul>`
    }

    toLeaflet(){
        let style = {
            // Colorscale: 0 to 15min to ride 1km
            color: getColor(this.avg_time/this.distance(), 900),
            opacity: 1,
            weight: 2*Math.log(this.per_hour)
        }
        return L.polyline(this.latLng(), style)
                .bindPopup(this.popupContent())
    }

    toString(){
        return `<Leg ${this.fromStop.name} - ${this.toStop.name}>`
    }
}
