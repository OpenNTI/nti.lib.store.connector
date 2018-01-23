import React from 'react';
import PropTypes from 'prop-types';
import {HOC} from 'nti-commons';

export default class StoreConnector extends React.Component {

	/**
	 * Used to compose a Component Class. This returns a new Component Type.
	 *
	 * @param  {Object} store The store to connect to.
	 * @param  {Class} component The component to compose & wire to store updates.
	 * @param  {Object} propMap mapping of key from store to a a prop name.
	 *                          Ex:
	 *                          {
	 *                              'AppUser': 'user',
	 *                              'AppName': 'title',
	 *                          }
	 * @param  {Function} onMount A callback after the component mounts. Handy to dynamically build stores or load data.
	 * @return {Function} A Composed Component
	 */
	static connect (store, component, propMap, onMount) {
		class cmp extends React.Component {
			render () {
				return (
					<StoreConnector
						{...this.props}
						_store={store}
						_propMap={propMap}
						_component={component}
						_onMount={onMount}
					/>
				);
			}
		}

		return HOC.hoistStatics(cmp, component, 'StoreConnector');
	}


	static propTypes = {
		/*
		 * A store should implement at minimum three methods:
		 *
		 *     get(string): any
		 *         Used to retrieve a prop-mapping value from the store.
		 *
		 *     addChangeListener(function): void
		 *         Used to subscribe to updates.
		 *
		 *     removeChangeListener(function): void
		 *         Used to unsubscribe from updates.
		 */
		_store: PropTypes.shape({
			get: PropTypes.func.isRequired,
			addChangeListener: PropTypes.func.isRequired,
			removeChangeListener: PropTypes.func.isRequired
		}).isRequired,

		/*
		 * Optional/Required: This, or a single child must be specified... not both.
		 * A Component to render with added props. May be any valid component...
		 */
		_component: PropTypes.any,

		/*
		 * A mapping of Store-Key to propName.
		 * Keys present will be retrieved form the store and assigned to a prop passed to our Component/child.
		 */
		_propMap: PropTypes.object,

		/*
		 * A function to call when this component mounts. Usefull for triggering loads/constructing stores.
		 */
		_onMount: PropTypes.func,

		/*
		 * Optional/Required: This, or _component must be specified... not both.
		 * A single child... will clone and add props.
		 */
		children: PropTypes.element
	}


	componentWillMount () {
		const {_store: store} = this.props;
		this.subscribe(store);
	}


	componentDidMount () {
		const {_onMount: callback} = this.props;
		if (callback) {
			callback();
		}
	}


	componentWillReceiveProps (nextProps) {
		const {_store: B} = nextProps;
		const {_store: A} = this.props;
		if (A !== B) {
			this.subscribe(B);
		}
	}


	componentWillUnmount () {
		this.unmounted = true;
		if (this.unsubscribe) {
			this.unsubscribe();
		}
	}


	subscribe (store) {
		if (this.unsubscribe) {
			this.unsubscribe();
		}

		store.addChangeListener(this.onStoreChange);

		this.unsubscribe = () => (store.removeChangeListener(this.onStoreChange), delete this.unsubscribe);
	}


	onStoreChange = ({type} = {}) => {
		const {_propMap} = this.props;

		if (this.unmounted) {
			if (this.unsubscribe) {
				this.unsubscribe();
			}
			return;
		}

		if (!type && _propMap) {
			throw new Error ('No type on change.');
		}

		if (!_propMap || _propMap.hasOwnProperty(type)) {
			this.forceUpdate();
		}
	}


	getPropsFromMap () {
		const {_component, _store, _propMap = {}, ...others} = this.props;
		const keys = Object.keys(_propMap);

		const props = {...others};
		for(let privateKey of Object.keys(StoreConnector.propTypes)) {

			//Don't consider 'children' a private prop if we are in "_component" mode.
			if (privateKey === 'children' && _component) {
				continue;
			}

			delete props[privateKey];
		}

		for (let key of keys) {
			if (typeof _propMap[key] === 'string') {
				const storeValue = _store[key];

				if(typeof storeValue === 'function') {
					props[_propMap[key]] = (...args) => {
						return _store[key](...args);
					};
				}
				else {
					props[_propMap[key]] = storeValue;
				}
			} else if (typeof key === 'string' && _propMap[key] != null) {
				props[key] = _propMap[key];
			}
		}

		return props;
	}


	render () {
		const {_component, children} = this.props;
		const props = this.getPropsFromMap();

		return _component
			? React.createElement(_component, props)
			: React.cloneElement(React.Children.only(children), props);
	}
}
