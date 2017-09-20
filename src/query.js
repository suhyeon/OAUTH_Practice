const knex = require('./knex')
const bcrypt = require('bcrypt')
const validator = require('validator')

module.exports = {
  firstOrCreateUserByProvider(provider, provider_user_id, access_token=null, avatar_url=null) {
    return knex('user')
      .where({
        provider,
        provider_user_id
      })
      .first()
      .then(user => {
        if (user) { //있으면 user return
          return user
        } else { //없으면 만들어서 리턴
          return knex('user')
            .insert({
              provider,
              provider_user_id,
              access_token,
              avatar_url
            })
            .then(([id]) => { //인서트 한후 위에서 만들어낸 id를 가지고 올 수 있다.
              return knex('user')
                .where({id})
                .first()
            })
        }
      })
  },
  getUserById(id) {
    return knex('user')
      .where({id})
      .first()
  },
}
