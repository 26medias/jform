(function() {
	var jformFactory = function() {
		this.modules 	= {};
		this.plugins 	= {};
	};
	// Register a new question type
	jformFactory.prototype.register = function(name, factory, about) {
		if (this.modules[name]) {
			console.info("/!\ Module '"+name+"' is already defined. Duplicate:", about);
			return false;
		} else {
			this.modules[name] = factory;
			return true;
		}
	};
	// Register a new plugin
	jformFactory.prototype.plugin = function(name, data, about, overwrite) {
		if (this.plugins[name] && !overwrite) {
			console.info("/!\ Plugin '"+name+"' is already defined. Duplicate:", about);
			return false;
		} else {
			this.plugins[name] = data;
			return true;
		}
	};
	// Utility, to create new dom elements
	jformFactory.prototype.dom = function(nodeType, appendTo, raw) {
		var element = document.createElement(nodeType);
		if (appendTo != undefined) {
			$(appendTo).append($(element));
		}
		return (raw === true)?element:$(element);
	};
	
	
	var jform = function() {
		this.fields		= {};
		this.data		= {};
		this.errors		= [];
		
		this.theme		= {
			line:	{
				classname:	"form-group",
				type:		"div"
			},
			label:	{
				classname:	"control-label",
				type:		"label"
			},
			field:	{
				classname:	false,
				type:		"div"
			},
		};
		var scope = this;
		
		// Import the plugins
		var plugin;
		for (plugin in window.jformFactory.plugins) {
			if (this[plugin]) {
				console.error("/!\ Plugin '"+plugin+"' was refused. This name is either already in use internally or already registered by another plugin.");
			} else {
				this[plugin] = window.jformFactory.plugins[plugin](this);
				console.log("Plugin '"+plugin+"' has been installed.", this[plugin]);
			}
		}
		
		// Conditionnal Framework, used to write easy display conditions in the form.
		this.conditionFramework = function(fieldName) {
			if (!scope.fields[fieldName]) {
				console.error("/!\ field '"+fieldName+"' desn't exist.");
				return this;
			}
			this.field 	= scope.fields[fieldName];
			return this;
		}
		this.conditionFramework.prototype.equal = function(value) {
			if (!this.field) {
				console.error("/!\ Condition: No field selected.");
				return false;
			}
			if (!this.field.active) {
				return false;
			}
			if (this.field.instance.validate() && this.field.instance.val() == value) {
				return true;
			}
			return false;
		}
		this.conditionFramework.prototype.contains = function(value) {
			if (!this.field) {
				console.error("/!\ Condition: No field selected.");
				return false;
			}
			if (!this.field.active) {
				return false;
			}
			var scope = this;
			if (_.isArray(value)) {
				if (!scope.field.instance.validate()) {
					return false;
				}
				var ok = true;
				_.each(value, function(val) {
					ok &= _.contains(scope.field.instance.val(),val);
				});
				return ok;
			} else {
				if (this.field.instance.validate() && _.contains(this.field.instance.val(),value)) {
					return true;
				}
			}
			return false;
		}
	};
	// Build the form
	jform.prototype.build = function(container, options) {
		
		var scope = this;
		
		this.options 	= _.extend({
			form:		{},
			submit:		$(),
			onSubmit:	function() {},
			onError:	function() {}
		}, options);
		
		this.container 	= container;
		
		_.each(this.options.form, function(item) {
			if (item.condition && typeof item.condition == "string") {
				// If the condition is a string (to be able to save in a database for example), we need to parse it. We don't want to polute the current scope, so we create a new scope using an anonymous function.
				(function(item) {
				    item.condition = new Function("scope", "with(scope){return "+ item.condition + ";}")(this);
				})(item);
			}
			
			if (scope.fields[item.name]) {
				console.info("/!\ field '"+item.name+"' is already defined. Duplicate:", scope.fields[item.name]);
				return this;
			} else {
				if (!window.jformFactory.modules[item.type]) {
					console.info("/!\ factory '"+item.type+"' doesn't exist on ", item);
					return this;
				} else {
					// Create a new instance of the question type
					var instance 		= new window.jformFactory.modules[item.type](scope, item);
					// Create a new line (HTML form line)
					var line = scope.createLine(item);
					// Build the field in that line
					instance.build(line);
					// Setup the update event
					// When a field is updated, the conditions are checked again to show/hide the proper questions.
					instance.onUpdate(function() {
						scope.executeConditions();
					});
					// Create the object
					scope.fields[item.name] 	= {
						factory:	window.jformFactory.modules[item.type],
						instance:	instance,
						data:		item,
						line:		line,
						active:		true	// Active (visible) by default
					};
					// But hide by default.
					// When the form is built, the conditions will be checked and display the questions that need to be displayed with a pretty animation.
					line.line.hide();
				}
				return this;
			}
		});
		
		// Setup the click event on the submit button
		this.options.submit.unbind('click').bind('click',function() {
			// If the form validates (all of the questions), we call onSubmit(), else onError()
			if (scope.validate()) {
				scope.options.onSubmit(scope.data, scope);	// scope.data is filled by validate(), and is a serialized object that contains the answers to the form.
			} else {
				scope.options.onError(scope.errors, scope);	// scope.errors is filled by validate(), and list the questions that are not validating.
			}
		});
		
		// Check the conditions on the questions
		this.executeConditions();
		
		return this;
	};
	// validating the form
	jform.prototype.validate = function(data) {
		// We simply ccall the validate() method for each question, and return true only if all of the visible (active) questions are validating.
		var i;
		this.data 	= {};
		this.errors = [];
		var error = false;
		for (i in this.fields) {
			if (this.fields[i].active) {
				if (!this.fields[i].instance.validate()) {
					error |= true;
					this.errors.push({
						field:		this.fields[i],
						name:		i
					});
				} else {
					this.data[i] = this.fields[i].instance.val();
				}
			}
		}
		if (error) {
			return false;
		} else {
			return true;
		}
	};
	// Execute the conditions
	jform.prototype.executeConditions = function() {
		var i;
		// We will count the number of changes (show->hide or hide->show) triggered by the call.
		// If there were changes, then we'll re-execute the function, until there are no more changes.
		var changes	= 0;
		for (i in this.fields) {
			if (this.fields[i].data.condition) {
				if (this.fields[i].data.condition(this.conditionFramework)) {
					if (this.fields[i].active != true) {
						changes++;
						this.fields[i].active	= true;
						this.fields[i].line.line.slideDown();
					}
				} else {
					if (this.fields[i].active != false) {
						changes++;
						this.fields[i].active	= false;
						this.fields[i].line.line.slideUp();
					}
				}
			} else {
				this.fields[i].line.line.slideDown();
			}
		}
		// If there were updates, just keep going.
		if (changes > 0) {
			this.executeConditions();
		}
	};
	// Create a form line (DOM), based on the theme (this.theme)
	jform.prototype.createLine = function(data) {
		var line 	= window.jformFactory.dom(this.theme.line.type, this.container);
		if (this.theme.line.classname) {
			line.addClass(this.theme.line.classname);
		}
		var label 	= window.jformFactory.dom(this.theme.label.type, line);
			label.html(data.label);
		if (this.theme.label.classname) {
			label.addClass(this.theme.label.classname);
		}
		var field 	= window.jformFactory.dom(this.theme.field.type, line);
		if (this.theme.field.classname) {
			field.addClass(this.theme.field.classname);
		}
		// Return the individual components (DOM nodes)
		return {
			line:	line,
			label:	label,
			field:	field
		};
	};
	// Stringify the form data in JSON, including the functions (conditions).
	// Useful to save the form in a database for example
	jform.prototype.stringify = function(format) {
		var output = [];
		_.each(this.options.form, function(field) {
			var fieldcopy = _.extend({}, field); // We make a deep-copy of the object
			if (fieldcopy.condition && typeof fieldcopy.condition != "string") {
				// We are converting the condition functions into a string, then removing all the comments from it and finally, we remove all the extra whitespaces.
				fieldcopy.condition = fieldcopy.condition.toString().replace(/\/\*[.\r\n\t\w\W\s]*\*\//, '').replace(/\/\/(.*)[\r\n]/gm, '').replace(/[\t\r\n]/gm, '');
			}
			output.push(fieldcopy);
		});
		// Format the output?
		if (format) {
			return JSON.stringify(output, null, 4);
		} else {
			return JSON.stringify(output);
		}
	};
	
	// Global scope
	window.jformFactory = new jformFactory();
	window.jform 		= jform;
})();