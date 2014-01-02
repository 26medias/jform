(function() {
	var jformHelper = {
		
	};
	var jformFactory = function() {
		this.modules 	= {};
		this.plugins 	= {};
	};
	jformFactory.prototype.register = function(name, factory, about) {
		if (this.modules[name]) {
			console.info("/!\ Module '"+name+"' is already defined. Duplicate:", about);
			return false;
		} else {
			this.modules[name] = factory;
			return true;
		}
	};
	jformFactory.prototype.plugin = function(name, data, about) {
		if (this.plugins[name]) {
			console.info("/!\ Plugin '"+name+"' is already defined. Duplicate:", about);
			return false;
		} else {
			this.plugins[name] = data;
			return true;
		}
	};
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
	jform.prototype.build = function(container, options) {
		
		var scope = this;
		
		this.options 	= _.extend({
			form:		{},
			onSubmit:	function() {},
			onError:	function() {}
		}, options);
		
		this.container 	= container;
		
		_.each(this.options.form, function(item) {
			if (scope.fields[item.name]) {
				console.info("/!\ field '"+item.name+"' is already defined. Duplicate:", scope.fields[item.name]);
				return this;
			} else {
				if (!window.jformFactory.modules[item.type]) {
					console.info("/!\ factory '"+item.type+"' doesn't exist on ", item);
					return this;
				} else {
					var instance 		= new window.jformFactory.modules[item.type](scope, item);
					var line = scope.createLine(item);
					instance.build(line);
					instance.onUpdate(function() {
						scope.executeConditions();
					});
					scope.fields[item.name] 	= {
						factory:	window.jformFactory.modules[item.type],
						instance:	instance,
						data:		item,
						line:		line,
						active:		true
					};
				}
				return this;
			}
		});
		
		this.options.submit.click(function() {
			if (scope.validate()) {
				scope.options.onSubmit(scope.data, scope);
			} else {
				scope.options.onError(scope.errors, scope);
			}
		});
		
		this.executeConditions();
		
		return this;
	};
	jform.prototype.validate = function(data) {
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
	jform.prototype.executeConditions = function() {
		var i;
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
			}
		}
		// If there were updates, just keep going.
		if (changes > 0) {
			this.executeConditions();
		}
	};
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
		return {
			line:	line,
			label:	label,
			field:	field
		};
	};
	jform.prototype.stringify = function(format) {
		var output = [];
		_.each(this.options.form, function(field) {
			var fieldcopy = _.extend({}, field);
			if (fieldcopy.condition) {
				fieldcopy.condition = fieldcopy.condition.toString().replace(/[\t\r\n]/gm, '');
			}
			output.push(fieldcopy);
		});
		console.log("stringify",output);
		if (format) {
			return JSON.stringify(output, null, 4);
		} else {
			return JSON.stringify(output);
		}
	};
	window.jformFactory = new jformFactory();
	window.jformHelper 	= jformHelper;
	window.jform 		= jform;
})();