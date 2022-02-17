"use strict";

const form = document.querySelector(".form");
const allInputs = document.querySelectorAll("input");
const inputType = document.querySelector(".form-input-type");
const distanceInput = document.querySelector(".form-input-distance");
const durationInput = document.querySelector(".form-input-duration");
const inputCadence = document.querySelector(".form-input-cadence");
const inputElevgain = document.querySelector(".form-input-elevgain");
const workoutsContainer = document.querySelector(".workouts");
const clearData = document.querySelector(".clear-data");
const xButton = document.querySelector(".fa-close");
const findMeBtn = document.querySelector(".findme");
const entryText = document.querySelector(".entry-text");

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;
  constructor(coords, dist, duration) {
    this.coords = coords; // [lat, lng]
    this.dist = dist; //km
    this.duration = duration; //min
  }
  _setDescription() {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, dist, duration, cadence) {
    super(coords, dist, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min per km
    this.pace = this.duration / this.dist;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, dist, duration, evGain) {
    super(coords, dist, duration);
    this.evGain = evGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.dist / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////////
// APP ARCHITECTURE
class App {
  #map;
  #mapZoom = 15;
  #mapEvent;
  #workouts = [];
  constructor() {
    //get position
    this._getPosition();

    //get data from localstorage
    this._getLocalStorage();
    this._clearData();
    //event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    workoutsContainer.addEventListener("click", this._moveToPopUp.bind(this));
    clearData.addEventListener("click", this.reset);
    xButton.addEventListener("click", this._hideForm);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your location");
        }
      );
    }
  }

  _loadMap(pos) {
    const { latitude } = pos.coords;
    const { longitude } = pos.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoom);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      {}
    ).addTo(this.#map);
    L.marker(coords).addTo(this.#map).bindPopup("You are here 🙋‍♂️").openPopup();
    findMeBtn.addEventListener("click", () => {
      this.#map.setView(coords, this.#mapZoom, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    });

    /*     L.marker(coords)
      .addTo(this.#map)
      .bindPopup("You are here")
      .openPopup(); */

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((workout) => this._renderWorkoutMarker(workout));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    distanceInput.focus();
  }

  _hideForm() {
    //clears inputs
    allInputs.forEach((e) => (e.value = ""));
    //hides form
    /* form.style.display = "none"; */
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevgain.closest(".form-row").classList.toggle("form-row-hidden");
    inputCadence.closest(".form-row").classList.toggle("form-row-hidden");
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const checkIfPos = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    //get data
    const type = inputType.value;
    const distance = +distanceInput.value;
    const duration = +durationInput.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //if running create running obj
    if (type === "running") {
      const cadence = +inputCadence.value;
      //check if valid
      if (
        !validInputs(distance, duration, cadence) ||
        !checkIfPos(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers!");

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // in cycling create cycling obj
    if (type === "cycling") {
      const elevGain = +inputElevgain.value;
      //check if valid
      if (
        !validInputs(distance, duration, elevGain) ||
        !checkIfPos(distance, duration)
      )
        return alert("Inputs have to be positive numbers!");
      workout = new Cycling([lat, lng], distance, duration, elevGain);
    }

    //add new obj to workout array
    this.#workouts.push(workout);
    console.log(workout);
    //render workout on map
    this._renderWorkoutMarker(workout);
    //render workout list
    this._renderWorkout(workout);
    //hide and clear data
    //clear input fields
    this._hideForm();

    //set local storage
    this._localDataStore();
    //shows clear button if needed
    this._clearData();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class='workout workout-${workout.type}' data-id='${workout.id}'>
    <h2 class='workout-title'>${workout.description}</h2>
    <div class='workout-row'>
      <span>${workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"}</span>
      <span class='workout-stats'>${workout.dist}</span>
      <span class='workout-units'>km</span>
    </div>
    <div class='workout-row'>
      <span>⏱</span>
      <span class='workout-stats'>${workout.duration}</span>
      <span class='workout-units'>min</span>
    </div>
  `;
    if (workout.type === "running")
      html += `
  <div class='workout-row'>
    <span>⚡</span>
    <span class='workout-stats'>${workout.pace.toFixed(1)}</span>
    <span class='workout-units'>min/km</span>
  </div>
  <div class='workout-row'>
    <span>🦶</span>
    <span class='workout-stats'>${workout.cadence}</span>
    <span class='workout-units'>spm</span>
  </div>
  </li>
  `;

    if (workout.type === "cycling")
      html += `
  <div class='workout-row'>
    <span>⚡</span>
    <span class='workout-stats'>${workout.speed.toFixed(1)}</span>
    <span class='workout-units'>km/h</span>
  </div>
  <div class='workout-row'>
    <span>🚵‍♂️</span>
    <span class='workout-stats'>${workout.evGain}</span>
    <span class='workout-units'>m</span>
  </div>
  </li>`;
    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopUp(e) {
    const workoutEl = e.target.closest(".workout");

    if (!workoutEl) return;
    console.log(workoutEl);
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    /* workout.click(); */
  }
  _localDataStore() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach((workout) => this._renderWorkout(workout));
  }
  _clearData() {
    if (this.#workouts.length > 0) {
      clearData.classList.remove("hidden");
      entryText.classList.add("hidden");
    }
  }
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
