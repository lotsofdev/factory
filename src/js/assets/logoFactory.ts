import { html } from 'lit';

export default html`<svg
  class="s-factory_logo"
  viewBox="0 0 40 40"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M10 40H40V40C40 34.4772 35.5228 30 30 30H10V40Z"
    fill="black"
    fill-opacity="0.1"
  />
  <path
    class="-accent"
    d="M0 30H20V35C20 37.7614 17.7614 40 15 40H10C4.47715 40 0 35.5228 0 30V30Z"
    fill="#FFD500"
  />
  <path
    d="M0 5C0 2.23858 2.23858 0 5 0H10C15.5228 0 20 4.47715 20 10V10H0V5Z"
    class="-accent"
  />
  <path
    d="M10 10C10 4.47715 14.4772 0 20 0H35C37.7614 0 40 2.23858 40 5V10H10V10Z"
    fill="black"
  />
  <path
    class="-accent"
    d="M20 25H40V20C40 17.2386 37.7614 15 35 15H20V25Z"
    fill="#FFD500"
  />
  <path d="M0 15H30V15C30 20.5228 25.5228 25 20 25H0V15Z" fill="black" />
</svg> `;
