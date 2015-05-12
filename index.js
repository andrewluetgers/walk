
(function() {
	var root = this,
		previous_walk = root.walk,
		_ = root._,
		has_require = typeof require !== 'undefined';

	if (typeof _ === 'undefined') {
		if (has_require) {
			_ = require('lodash');
		} else {
			throw new Error('walk requires lodash, see https://lodash.com');
		}
	}

	var ArrayProto = Array.prototype;

	function $flat() {
		var flatArray = ArrayProto.concat.apply(ArrayProto, arguments);
		return _.any(flatArray, _.isArray) ? $flat.apply(this, flatArray) : flatArray;
	}

	/*
	 * @param obj (object) the object to read properties from
	 * @param handler (function) function(value, key, object, parents, siblings, depth, path) { return boolean; }
	 * traverse an object calling a handler on each property
	 * do so with depth first top down order on owned objects by default
	 * optionally can choose depth first, reversing the order of execution, not limiting to owned objects
	 */
	function walk(obj, handler, isDepthFirst, isReverseOrder, allProps) {
		if (typeof obj !== "object" || _.isNull(obj)) {
			throw new Error("traverse source must be an object");
		}

		if (!_.isFunction(handler)) {
			throw new Error("traverse handler must be a function");
		}

		allProps = !!allProps;

		var exec,
			res = {
				breadthFirst: [],
				depthFirst: [],
				siblings: [],
				allProps: allProps,
				res: null
			};

		_walk(obj, handler, -1, isDepthFirst, isReverseOrder, res, allProps, [], []);

		// finalize the bread-first list
		res.siblings = res.breadthFirst;
		res.breadthFirst = $flat(res.breadthFirst);

		console.log(res);

		if (isDepthFirst) {
			exec = res.depthFirst;
		} else {
			exec = res.breadthFirst;
		}

		if (isReverseOrder) {
			exec = exec.reverse();
		}

		var _res = _.map(exec, function (obj) {
			return obj.fn();
		});
		res.res = _.filter(_res, function (val) {
			return val !== undefined;
		});

		return res;
	}

	// does the actual work for $walk
	function _walk(obj, handler, depth, isBreadthFirst, isReverseOrder, res, allProps, parents, path) {
		depth++;

		var _parents,
			_path,
			key, val,
			depthFirst = res.depthFirst,
			breadthFirst = res.breadthFirst,
			siblings = [],
			levels = [];

		if (!breadthFirst[depth]) {
			// init the breadthFirst per-level calls array
			breadthFirst[depth] = levels;
		} else {
			levels = breadthFirst[depth];
		}

		for (key in obj) {
			//console.log(key);
			if (allProps || obj.hasOwnProperty(key)) {
				val = obj[key];
				//console.log(val);
				_parents = [].concat(parents, obj);
				_path = [].concat(path, key);

				// capture closure values in a new context for later access
				(function (v, k, o, parents, d, path) {
					// a function we can call later that would be tha same as calling it now
					var theObj = {
						val: v,
						key: k,
						depth: d,
						fn: function () {
							return handler(v, k, o, parents, siblings, d, path);
						},
						parents: parents,
						siblings: siblings,
						path: path
					};
					depthFirst.push(theObj);
					siblings.push(theObj);
				}(val, key, obj, _parents, depth, _path));

				// recursive call
				if (typeof val === "object" && !_.isNull(val)) {
					// todo check for cycles! if === one of the parents do not pass go
					_walk(val, handler, depth, isBreadthFirst, isReverseOrder, res, allProps, _parents, _path);
				}
			}
		}

		levels.push(siblings);

		depth--;
	}

	if (typeof exports !== 'undefined') {
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = walk;
		}
		exports.walk = walk;
	} else {
		root.walk = walk;
	}

}());