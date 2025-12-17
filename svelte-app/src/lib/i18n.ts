import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type Language = 'nl' | 'en';

const translations = {
	nl: {
		// App
		appName: 'Gift Name Shuffler',
		appTagline: 'Een eenvoudige app voor cadeautjes uitwisseling.',

		// Navigation
		home: 'Home',
		occasions: 'Gelegenheden',
		myWishlist: 'Mijn Wishlist',
		help: 'Help',
		login: 'Inloggen',
		logout: 'Uitloggen',
		loading: 'Laden...',

		// Home page
		welcome: 'Welkom bij Gift Name Shuffler',
		welcomeText: 'Organiseer je cadeautjes uitwisseling met Solid Pods - jouw data blijft van jou!',
		occasionsTitle: 'Gelegenheden',
		occasionsDesc: 'Maak een gelegenheid aan (Kerst, verjaardag, etc.) en nodig deelnemers uit.',
		goToOccasions: 'Naar Gelegenheden',
		wishlistTitle: 'Wishlist',
		wishlistDesc: 'Beheer je persoonlijke wishlist. Je data wordt opgeslagen in je eigen Solid Pod.',
		goToWishlist: 'Naar Wishlist',
		whatIsSolid: 'Wat is Solid?',
		solidDescription: 'is een protocol dat je controle geeft over je eigen data. In plaats van dat bedrijven je gegevens beheren, sla je alles op in je persoonlijke "Pod" - een veilige online opslag die alleen van jou is.',

		// Login
		notLoggedIn: 'Je bent niet ingelogd. Klik op',
		inNavigation: 'in de navigatie om verder te gaan.',
		howDoesThisWork: 'Hoe werkt dit?',

		// Occasions
		myOccasions: 'Mijn Gelegenheden',
		view: 'Bekijk',
		createNewOccasion: 'Nieuwe Gelegenheid Aanmaken',
		name: 'Naam',
		dateOptional: 'Datum (optioneel)',
		create: 'Aanmaken',
		occasionPlaceholder: 'bijv. Kerstfeest 2025',
		loginToCreate: 'Log in om een nieuwe gelegenheid aan te maken, of open een uitnodigingslink.',
		organizedBy: 'Georganiseerd door:',
		edit: 'Bewerken',
		delete: 'Verwijderen',
		editOccasion: 'Gelegenheid Bewerken',
		save: 'Opslaan',
		cancel: 'Annuleren',
		registeredParticipants: 'Ingeschreven Deelnemers',
		noRegistrations: 'Nog geen inschrijvingen.',
		unknown: 'Onbekend',
		inviteLink: 'Uitnodigingslink',
		shareLink: 'Deel deze link met deelnemers:',
		copyLink: 'Kopieer link',
		linkCopied: 'Link gekopieerd!',
		youAreRegistered: 'Je bent ingeschreven!',
		participatingIn: 'Je neemt deel aan',
		manageWishlist: 'Beheer je wishlist →',
		registerForOccasion: 'Schrijf je in voor deze gelegenheid zodat anderen je wishlist kunnen zien.',
		register: 'Schrijf me in',
		loginToRegister: 'Log in om je in te schrijven voor deze gelegenheid.',
		confirmDelete: 'Weet je zeker dat je deze gelegenheid wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
		enterName: 'Vul een naam in.',
		enterOccasionName: 'Vul een naam in voor de gelegenheid.',
		mustLogin: 'Je moet eerst inloggen.',
		couldNotLoad: 'Kon gelegenheid niet laden:',
		couldNotCreate: 'Kon gelegenheid niet aanmaken:',
		couldNotUpdate: 'Kon gelegenheid niet bijwerken:',
		couldNotDelete: 'Kon gelegenheid niet verwijderen:',
		couldNotRegister: 'Kon niet inschrijven:',

		// Wishlist
		myWishlistTitle: 'Mijn Wishlist',
		wishlistInfo: 'Beheer hier je verlanglijstje. Je items worden opgeslagen in je Solid Pod.',
		loginToManageWishlist: 'Log in met je Solid account om je wishlist te beheren.',
		wishlistLoading: 'Wishlist laden...',
		noItems: 'Je hebt nog geen items op je wishlist.',
		addFirstItem: 'Voeg je eerste item toe!',
		wishlistEmpty: 'Je wishlist is nog leeg. Voeg items toe!',
		addNewItem: 'Nieuw item toevoegen',
		itemName: 'Naam van het item',
		itemNameRequired: 'Naam *',
		itemPlaceholder: 'bijv. Boek over tuinieren',
		description: 'Beschrijving',
		descriptionOptional: 'Beschrijving (optioneel)',
		descriptionPlaceholder: 'Optionele beschrijving...',
		linkUrl: 'Link (URL)',
		linkOptional: 'Link (optioneel)',
		priority: 'Prioriteit',
		priority5: 'Heel graag',
		priority4: 'Graag',
		priority3: 'Normaal',
		priority2: 'Minder',
		priority1: 'Als het moet',
		add: 'Toevoegen',
		addToWishlist: 'Toevoegen aan Wishlist',
		removeItem: 'Verwijderen',
		viewLink: 'Bekijk →',
		linkArrow: 'Link →',
		enterItemName: 'Vul een naam in voor het item.',
		confirmRemoveItem: 'Weet je zeker dat je dit item wilt verwijderen?',
		couldNotLoadWishlist: 'Kon wishlist niet laden:',
		couldNotSave: 'Kon niet opslaan:',
		couldNotRemove: 'Kon item niet verwijderen:',

		// Help page
		howDoesItWork: 'Hoe werkt het?',
		helpIntro: 'Deze app gebruikt Solid Pods om je gegevens veilig op te slaan. Jij bepaalt wie toegang heeft tot jouw data.',
		whatIsSolidPod: 'Wat is een Solid Pod?',
		solidPodExplanation: 'Een Solid Pod is jouw persoonlijke online opslag. Het is als een kluis voor je gegevens waar alleen jij de sleutel van hebt. Je kiest zelf welke apps toegang krijgen.',
		createAccount: 'Account aanmaken',
		goToRegistration: 'solidcommunity.net registratie',
		fillEmailPassword: 'Vul je e-mailadres en wachtwoord in',
		clickRegister: 'Klik op "Register"',
		createPod: 'Maak een Pod',
		clickCreatePod: 'Klik op "Create pod"',
		fillName: 'Vul je naam in (dit wordt onderdeel van je WebID)',
		clickCreatePodButton: 'Klik op "Create pod"',
		youHavePod: 'Je hebt nu een Solid Pod!',
		loginToApp: 'Inloggen in deze app',
		selectProvider: 'Selecteer "solidcommunity.net" als provider',
		clickLogin: 'Klik op "Inloggen met Solid"',
		redirected: 'Je wordt doorgestuurd naar solidcommunity.net',
		loginThere: 'Log daar in met je e-mailadres en wachtwoord',
		selectWebId: 'Selecteer je WebID en klik op "Authorize"',
		youAreLoggedIn: 'Je bent ingelogd!',
		participateInOccasion: 'Deelnemen aan een gelegenheid',
		openInviteLink: 'Open de uitnodigingslink die je hebt ontvangen',
		loginWithSolid: 'Log in met je Solid account',
		clickRegisterButton: 'Klik op "Schrijf me in"',
		goToWishlistManage: 'om je verlanglijstje te beheren',
		moreInfo: 'Meer informatie',
		readMoreSolid: 'Lees meer over Solid op',
		backToHome: '← Terug naar home'
	},
	en: {
		// App
		appName: 'Gift Name Shuffler',
		appTagline: 'A simple app for gift exchange.',

		// Navigation
		home: 'Home',
		occasions: 'Occasions',
		myWishlist: 'My Wishlist',
		help: 'Help',
		login: 'Login',
		logout: 'Logout',
		loading: 'Loading...',

		// Home page
		welcome: 'Welcome to Gift Name Shuffler',
		welcomeText: 'Organize your gift exchange with Solid Pods - your data stays yours!',
		occasionsTitle: 'Occasions',
		occasionsDesc: 'Create an occasion (Christmas, birthday, etc.) and invite participants.',
		goToOccasions: 'Go to Occasions',
		wishlistTitle: 'Wishlist',
		wishlistDesc: 'Manage your personal wishlist. Your data is stored in your own Solid Pod.',
		goToWishlist: 'Go to Wishlist',
		whatIsSolid: 'What is Solid?',
		solidDescription: 'is a protocol that gives you control over your own data. Instead of companies managing your data, you store everything in your personal "Pod" - a secure online storage that belongs only to you.',

		// Login
		notLoggedIn: 'You are not logged in. Click',
		inNavigation: 'in the navigation to continue.',
		howDoesThisWork: 'How does this work?',

		// Occasions
		myOccasions: 'My Occasions',
		view: 'View',
		createNewOccasion: 'Create New Occasion',
		name: 'Name',
		dateOptional: 'Date (optional)',
		create: 'Create',
		occasionPlaceholder: 'e.g. Christmas 2025',
		loginToCreate: 'Log in to create a new occasion, or open an invitation link.',
		organizedBy: 'Organized by:',
		edit: 'Edit',
		delete: 'Delete',
		editOccasion: 'Edit Occasion',
		save: 'Save',
		cancel: 'Cancel',
		registeredParticipants: 'Registered Participants',
		noRegistrations: 'No registrations yet.',
		unknown: 'Unknown',
		inviteLink: 'Invitation Link',
		shareLink: 'Share this link with participants:',
		copyLink: 'Copy link',
		linkCopied: 'Link copied!',
		youAreRegistered: 'You are registered!',
		participatingIn: 'You are participating in',
		manageWishlist: 'Manage your wishlist →',
		registerForOccasion: 'Register for this occasion so others can see your wishlist.',
		register: 'Register',
		loginToRegister: 'Log in to register for this occasion.',
		confirmDelete: 'Are you sure you want to delete this occasion? This cannot be undone.',
		enterName: 'Please enter a name.',
		enterOccasionName: 'Please enter a name for the occasion.',
		mustLogin: 'You must log in first.',
		couldNotLoad: 'Could not load occasion:',
		couldNotCreate: 'Could not create occasion:',
		couldNotUpdate: 'Could not update occasion:',
		couldNotDelete: 'Could not delete occasion:',
		couldNotRegister: 'Could not register:',

		// Wishlist
		myWishlistTitle: 'My Wishlist',
		wishlistInfo: 'Manage your wishlist here. Your items are stored in your Solid Pod.',
		loginToManageWishlist: 'Log in with your Solid account to manage your wishlist.',
		wishlistLoading: 'Loading wishlist...',
		noItems: 'You have no items on your wishlist yet.',
		addFirstItem: 'Add your first item!',
		wishlistEmpty: 'Your wishlist is empty. Add items!',
		addNewItem: 'Add new item',
		itemName: 'Item name',
		itemNameRequired: 'Name *',
		itemPlaceholder: 'e.g. Book about gardening',
		description: 'Description',
		descriptionOptional: 'Description (optional)',
		descriptionPlaceholder: 'Optional description...',
		linkUrl: 'Link (URL)',
		linkOptional: 'Link (optional)',
		priority: 'Priority',
		priority5: 'Really want',
		priority4: 'Want',
		priority3: 'Normal',
		priority2: 'Less',
		priority1: 'If needed',
		add: 'Add',
		addToWishlist: 'Add to Wishlist',
		removeItem: 'Remove',
		viewLink: 'View →',
		linkArrow: 'Link →',
		enterItemName: 'Please enter a name for the item.',
		confirmRemoveItem: 'Are you sure you want to remove this item?',
		couldNotLoadWishlist: 'Could not load wishlist:',
		couldNotSave: 'Could not save:',
		couldNotRemove: 'Could not remove item:',

		// Help page
		howDoesItWork: 'How does it work?',
		helpIntro: 'This app uses Solid Pods to securely store your data. You decide who has access to your data.',
		whatIsSolidPod: 'What is a Solid Pod?',
		solidPodExplanation: 'A Solid Pod is your personal online storage. It\'s like a vault for your data where only you have the key. You choose which apps get access.',
		createAccount: 'Create account',
		goToRegistration: 'solidcommunity.net registration',
		fillEmailPassword: 'Fill in your email and password',
		clickRegister: 'Click "Register"',
		createPod: 'Create a Pod',
		clickCreatePod: 'Click "Create pod"',
		fillName: 'Fill in your name (this becomes part of your WebID)',
		clickCreatePodButton: 'Click "Create pod"',
		youHavePod: 'You now have a Solid Pod!',
		loginToApp: 'Log in to this app',
		selectProvider: 'Select "solidcommunity.net" as provider',
		clickLogin: 'Click "Login with Solid"',
		redirected: 'You will be redirected to solidcommunity.net',
		loginThere: 'Log in there with your email and password',
		selectWebId: 'Select your WebID and click "Authorize"',
		youAreLoggedIn: 'You are logged in!',
		participateInOccasion: 'Participate in an occasion',
		openInviteLink: 'Open the invitation link you received',
		loginWithSolid: 'Log in with your Solid account',
		clickRegisterButton: 'Click "Register"',
		goToWishlistManage: 'to manage your wishlist',
		moreInfo: 'More information',
		readMoreSolid: 'Read more about Solid at',
		backToHome: '← Back to home'
	}
} as const;

export type TranslationKey = keyof (typeof translations)['nl'];

// Get initial language from localStorage or browser
function getInitialLanguage(): Language {
	if (browser) {
		const stored = localStorage.getItem('language');
		if (stored === 'nl' || stored === 'en') {
			return stored;
		}
		// Check browser language
		const browserLang = navigator.language.split('-')[0];
		if (browserLang === 'nl') {
			return 'nl';
		}
	}
	return 'nl'; // Default to Dutch
}

export const language = writable<Language>(getInitialLanguage());

// Save language preference
if (browser) {
	language.subscribe((lang) => {
		localStorage.setItem('language', lang);
	});
}

export const t = derived(language, ($language) => {
	return (key: TranslationKey): string => {
		return translations[$language][key] || key;
	};
});

export function setLanguage(lang: Language) {
	language.set(lang);
}
