I want the getcontext function within AudioCuesSource.ts to return the list of accessibility signals and their descriptions as a string. Follow these steps for the same :

1. The list needs to be extracted from here : https://raw.githubusercontent.com/microsoft/vscode/f554e3c48013328227e23981a33d0f0d902dc75d/src/vs/workbench/contrib/accessibility/browser/accessibilityConfiguration.ts

2. fetch the contents of the const configuration: IConfigurationNode object (with he curly brances and all entries inside). 

2. This will have an entry called properties with key-value pairs as shown below. fecth just the contents within the properties:
	properties: {
		[AccessibilityVerbositySettingId.Terminal]: {
			description: localize('verbosity.terminal.description', 'Provide information about how to access the terminal accessibility help menu when the terminal is focused.'),
			...baseVerbosityProperty
		},
		[AccessibilityVerbositySettingId.DiffEditor]: {
			description: localize('verbosity.diffEditor.description', 'Provide information about how to navigate changes in the diff editor when it is focused.'),
			...baseVerbosityProperty
		},
		[AccessibilityVerbositySettingId.Chat]: {
			description: localize('verbosity.chat.description', 'Provide information about how to access the chat help menu when the chat input is focused.'),
			...baseVerbosityProperty
		},
		'accessibility.signalOptions.volume': {
			'description': localize('accessibility.signalOptions.volume', "The volume of the sounds in percent (0-100)."),
			'type': 'number',
			'minimum': 0,
			'maximum': 100,
			'default': 70,
			'tags': ['accessibility']

            ...
        }
    }

    2. If a key starts with accessibility.signals. fetch the description key-value pair within it. Format will be similar to :
    'accessibility.signals.name': {
			'description': localize('accessibility.signalOptions.volume', "The volume of the sounds in percent (0-100)."),
			'type': 'number',
			'minimum': 0,
			'maximum': 100,
			'default': 70,
			'tags': ['accessibility']

            ...
        }

        In this just fetch localize('accessibility.signalOptions.volume', "The volume of the sounds in percent (0-100).")
    
    3. Remove the localize part in the descriptions. For e.g. for localize('accessibility.signalOptions.volume', "The volume of the sounds in percent (0-100)."), make it a key value pair of 'accessibility.signalOptions.volume' and "The volume of the sounds in percent (0-100).". 
    Return this final list of key value pairs with names and descriptions of audios 