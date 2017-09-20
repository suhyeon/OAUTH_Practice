require('dotenv').config()

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const csurf = require('csurf')
const flash = require('connect-flash')
const passport = require('passport')
const GitHubStrategy = require('passport-github').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy

const util = require('./util')
const query = require('./query')
const mw = require('./middleware')

const PORT = process.env.PORT || 3000

const app = express()

app.set('view engine', 'pug')
app.set('trust proxy')

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieSession({
  name: 'oasess',
  keys: [
    process.env.SECRET
  ]
}))
app.use(flash())
app.use(csurf())
app.use(mw.insertReq)
app.use(mw.insertToken)
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
  done(null, `${user.provider}:${user.provider_user_id}`)
})

passport.deserializeUser((str, done) => {
  const [provider, provider_user_id] = str.split(':')
  query.firstOrCreateUserByProvider(provider, provider_user_id)
    .then(user => {
      if (user) {
        done(null, user)
      } else {
        done(new Error('해당 정보와 일치하는 사용자가 없습니다.'))
      }
    })
})

//strategy 짜는 곳
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  const avatar_url = profile.photos[0] ? profile.photos[0].value : null // 프로필 사진
  query.firstOrCreateUserByProvider( //...으로 로그인 하기 링크를 누른 후 , 정보를 주려고 준비하는 단계
    // readme.md 의 6번과 7번 프로토콜 사이
    'github', //github 프로바이더에 대한 같은 식별자가 있으면 가지고 오고,
    profile.id, // 없다면 새로 만든다
    accessToken, // 그게 여기에서 일어난다.
    avatar_url
  ).then(user => {
    done(null, user)
  }).catch(err => {
    done(err)
  })
}))

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  const avatar_url = profile.photos[0] ? profile.photos[0].value : null // 프로필 사진
  query.firstOrCreateUserByProvider( //...으로 로그인 하기 링크를 누른 후 , 정보를 주려고 준비하는 단계
    // readme.md 의 6번과 7번 프로토콜 사이
    'google', //google 프로바이더에 대한 같은 식별자가 있으면 가지고 오고,
    profile.id, // 없다면 새로 만든다
    accessToken, // 그게 여기에서 일어난다.
    avatar_url
  ).then(user => {
    done(null, user)
  }).catch(err => {
    done(err)
  })
}))

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  profileFields: ['id', 'displayName', 'photos', 'email'],
  enableProof: true
}, (accessToken, refreshToken, profile, done) => {
  const avatar_url = profile.photos[0] ? profile.photos[0].value : null // 프로필 사진
  query.firstOrCreateUserByProvider( //...으로 로그인 하기 링크를 누른 후 , 정보를 주려고 준비하는 단계
    // readme.md 의 6번과 7번 프로토콜 사이
    'facebook', //google 프로바이더에 대한 같은 식별자가 있으면 가지고 오고,
    profile.id, // 없다면 새로 만든다
    accessToken, // 그게 여기에서 일어난다.
    avatar_url
  ).then(user => {
    done(null, user)
  }).catch(err => {
    done(err)
  })
}))

app.get('/', mw.loginRequired, (req, res) => {
  res.render('index.pug', req.user)
})

app.get('/login', (req, res) => {
  res.render('login.pug', req.user)
})

app.post('/logout', (req, res) => {
  req.logout()
  res.redirect('/login')
})

//github
//깃헙으로 로그인 하고 싶을때 이 주소로 이동하면 된다.
//우리 서버가 깃헙으로 리다이렉트
app.get('/auth/github', passport.authenticate('github'))

//깃헙에서 우리서버로 리다이렉트
app.get('/auth/github/callback', passport.authenticate('github', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

//google
//scope : oauth에서 권한 설정을 사용자에게 허락을 받는 범위
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile']
}))
app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))
//facebook
app.get('/auth/facebook', passport.authenticate('facebook', {
  //authType: 'rerequest',
  scope: ['public_profile', 'manage_pages']
}))
app.get('/auth/facebook/callback', passport.authenticate('facebook', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))
app.listen(PORT, () => {
  console.log(`listening ${PORT}...`)
})
